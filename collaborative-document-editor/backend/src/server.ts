import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';

const PORT = Number(process.env.PORT ?? 1234);
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

type RoomState = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
};

const rooms = new Map<string, RoomState>();
const app = express();

app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const writeSyncStep1 = (doc: Y.Doc): Uint8Array => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MSG_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
};

const writeAwarenessUpdate = (
  awareness: awarenessProtocol.Awareness,
  changedClients: number[]
): Uint8Array => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MSG_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
  );
  return encoding.toUint8Array(encoder);
};

const getRoom = (name: string): RoomState => {
  let room = rooms.get(name);
  if (!room) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    room = { doc, awareness, clients: new Set() };
    rooms.set(name, room);
  }
  return room;
};

const cleanupRoom = (name: string): void => {
  const room = rooms.get(name);
  if (!room || room.clients.size > 0) {
    return;
  }
  room.awareness.destroy();
  room.doc.destroy();
  rooms.delete(name);
};

wss.on('connection', (ws, request) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const roomName = url.searchParams.get('room')?.trim() || 'default-room';
  const room = getRoom(roomName);

  room.clients.add(ws);
  const clientId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

  const awarenessListener = ({
    added,
    updated,
    removed
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const changed = [...added, ...updated, ...removed];
    const update = writeAwarenessUpdate(room.awareness, changed);
    room.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(update);
      }
    });
  };

  room.awareness.on('update', awarenessListener);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(writeSyncStep1(room.doc));
  }

  ws.on('message', (message) => {
    const decoder = decoding.createDecoder(new Uint8Array(message as Buffer));
    const messageType = decoding.readVarUint(decoder);

    if (messageType === MSG_SYNC) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);

      if (encoding.length(encoder) > 1 && ws.readyState === WebSocket.OPEN) {
        ws.send(encoding.toUint8Array(encoder));
      }
      return;
    }

    if (messageType === MSG_AWARENESS) {
      const update = decoding.readVarUint8Array(decoder);
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
    }
  });

  ws.on('close', () => {
    room.clients.delete(ws);
    awarenessProtocol.removeAwarenessStates(room.awareness, [clientId], ws);
    room.awareness.off('update', awarenessListener);
    cleanupRoom(roomName);
  });

  ws.on('error', () => {
    ws.close();
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Collaboration server running on http://localhost:${PORT}`);
});
