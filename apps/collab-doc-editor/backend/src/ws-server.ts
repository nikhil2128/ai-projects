import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { documentStore } from './store/document-store';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

interface DocConnection {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
}

const docs = new Map<string, DocConnection>();

function getOrCreateDoc(docId: string): DocConnection {
  const existing = docs.get(docId);
  if (existing) return existing;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  awareness.setLocalState(null);

  const conns = new Map<WebSocket, Set<number>>();

  const stored = documentStore.getYDocState(docId);
  if (stored) {
    Y.applyUpdate(doc, stored);
  }

  doc.on('update', (update: Uint8Array) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    conns.forEach((_controlledIds, conn) => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(message);
      }
    });

    documentStore.saveYDocState(docId, Y.encodeStateAsUpdate(doc));
  });

  awareness.on('update', ({ added, updated, removed }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const changedClients = [...added, ...updated, ...removed];
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const message = encoding.toUint8Array(encoder);

    conns.forEach((_controlledIds, conn) => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(message);
      }
    });
  });

  const docConn: DocConnection = { doc, awareness, conns };
  docs.set(docId, docConn);
  return docConn;
}

function cleanupConnection(docConn: DocConnection, ws: WebSocket, docId: string): void {
  const controlledIds = docConn.conns.get(ws);
  docConn.conns.delete(ws);

  if (controlledIds) {
    awarenessProtocol.removeAwarenessStates(
      docConn.awareness,
      Array.from(controlledIds),
      null
    );
  }

  if (docConn.conns.size === 0) {
    documentStore.saveYDocState(docId, Y.encodeStateAsUpdate(docConn.doc));
    docConn.awareness.destroy();
    docConn.doc.destroy();
    docs.delete(docId);
  }
}

export function setupWSConnection(ws: WebSocket, docId: string): void {
  const docConn = getOrCreateDoc(docId);
  const { doc, awareness, conns } = docConn;

  conns.set(ws, new Set());

  ws.on('message', (rawMessage: Buffer | ArrayBuffer | Buffer[]) => {
    let message: Uint8Array;
    if (rawMessage instanceof Buffer) {
      message = new Uint8Array(rawMessage);
    } else if (rawMessage instanceof ArrayBuffer) {
      message = new Uint8Array(rawMessage);
    } else {
      message = new Uint8Array(Buffer.concat(rawMessage as Buffer[]));
    }

    try {
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MSG_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, doc, null);
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        }
        case MSG_AWARENESS: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awarenessStates.keys())
      )
    );
    ws.send(encoding.toUint8Array(encoder));
  }

  ws.on('close', () => {
    cleanupConnection(docConn, ws, docId);
  });

  ws.on('error', () => {
    cleanupConnection(docConn, ws, docId);
  });
}
