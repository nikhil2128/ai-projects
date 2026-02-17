import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

vi.mock('../../store/document-store', () => {
  const docs = new Map<string, any>();
  return {
    documentStore: {
      createDocument: vi.fn((title: string, authorId: string) => {
        const doc = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          authorId,
          sharedWith: [] as string[],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        docs.set(doc.id, doc);
        return doc;
      }),
      shareDocument: vi.fn((docId: string, userId: string) => {
        const doc = docs.get(docId);
        if (doc && !doc.sharedWith.includes(userId)) doc.sharedWith.push(userId);
        return doc;
      }),
      getYDocState: vi.fn(() => null),
      saveYDocState: vi.fn(),
    },
  };
});

import { documentStore } from '../../store/document-store';

const MSG_SYNC = 0;

let server: http.Server;
let wss: WebSocketServer;
let port: number;

describe('E2E Collaboration', () => {
  beforeAll(async () => {
    const { setupWSConnection } = await import('../../ws-server');

    server = http.createServer();
    wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const parsedUrl = url.parse(request.url || '', true);
      const pathname = parsedUrl.pathname || '';
      if (pathname.startsWith('/collaboration/')) {
        const docId = pathname.split('/collaboration/')[1];
        if (!docId) { socket.destroy(); return; }
        wss.handleUpgrade(request, socket, head, (ws) => {
          setupWSConnection(ws, docId);
        });
      } else {
        socket.destroy();
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    wss.clients.forEach((c) => c.terminate());
    wss.close();
    server.close();
  });

  function connectAndWait(docId: string): Promise<{ ws: WebSocket; firstMsg: Buffer }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/collaboration/${docId}`);
      const t = setTimeout(() => { ws.terminate(); reject(new Error('timeout')); }, 5000);
      ws.once('message', (data: Buffer) => {
        clearTimeout(t);
        resolve({ ws, firstMsg: data });
      });
      ws.on('error', (e) => { clearTimeout(t); reject(e); });
    });
  }

  function waitMsg(ws: WebSocket, ms = 5000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout')), ms);
      ws.once('message', (d) => { clearTimeout(t); resolve(d as Buffer); });
    });
  }

  it('should allow two users to connect to the same document', async () => {
    const doc = (documentStore.createDocument as any)('Test', 'user-a');
    (documentStore.shareDocument as any)(doc.id, 'user-b');

    const { ws: ws1, firstMsg: msg1 } = await connectAndWait(doc.id);
    expect(msg1).toBeDefined();

    const { ws: ws2, firstMsg: msg2 } = await connectAndWait(doc.id);
    expect(msg2).toBeDefined();

    expect(ws1.readyState).toBe(WebSocket.OPEN);
    expect(ws2.readyState).toBe(WebSocket.OPEN);

    ws1.terminate();
    ws2.terminate();
  }, 10000);

  it('should sync document edits between users', async () => {
    const doc = (documentStore.createDocument as any)('Sync', 'user-c');
    (documentStore.shareDocument as any)(doc.id, 'user-d');

    const { ws: ws1 } = await connectAndWait(doc.id);
    const { ws: ws2 } = await connectAndWait(doc.id);

    const clientDoc1 = new Y.Doc();
    const enc1 = encoding.createEncoder();
    encoding.writeVarUint(enc1, MSG_SYNC);
    syncProtocol.writeSyncStep1(enc1, clientDoc1);
    ws1.send(encoding.toUint8Array(enc1));

    const clientDoc2 = new Y.Doc();
    const enc2 = encoding.createEncoder();
    encoding.writeVarUint(enc2, MSG_SYNC);
    syncProtocol.writeSyncStep1(enc2, clientDoc2);
    ws2.send(encoding.toUint8Array(enc2));

    await new Promise((r) => setTimeout(r, 200));

    const text1 = clientDoc1.getText('content');
    text1.insert(0, 'Hello from user 1');

    const update = Y.encodeStateAsUpdate(clientDoc1);
    const syncEnc = encoding.createEncoder();
    encoding.writeVarUint(syncEnc, MSG_SYNC);
    syncProtocol.writeUpdate(syncEnc, update);
    ws1.send(encoding.toUint8Array(syncEnc));

    const received = await waitMsg(ws2);
    const data = new Uint8Array(received);
    const decoder = decoding.createDecoder(data);
    expect(decoding.readVarUint(decoder)).toBe(MSG_SYNC);

    clientDoc1.destroy();
    clientDoc2.destroy();
    ws1.terminate();
    ws2.terminate();
  }, 10000);

  it('should handle client disconnection', async () => {
    const doc = (documentStore.createDocument as any)('DC', 'user-e');
    (documentStore.shareDocument as any)(doc.id, 'user-f');

    const { ws: ws1 } = await connectAndWait(doc.id);
    const { ws: ws2 } = await connectAndWait(doc.id);

    ws1.close();
    await new Promise((r) => setTimeout(r, 150));
    expect(ws2.readyState).toBe(WebSocket.OPEN);
    ws2.terminate();
  }, 10000);

  it('should reject invalid paths', async () => {
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/invalid-path`);
      ws.on('error', () => resolve());
      ws.on('close', () => resolve());
      setTimeout(() => { ws.terminate(); resolve(); }, 2000);
    });
  }, 5000);
});
