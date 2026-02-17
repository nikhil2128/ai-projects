import { describe, it, expect, vi } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

vi.mock('../store/document-store', () => ({
  documentStore: {
    getYDocState: vi.fn(() => null),
    saveYDocState: vi.fn(),
  },
}));

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
let testId = 0;

async function createServer(docId: string) {
  const { setupWSConnection } = await import('../ws-server');
  const srv = http.createServer();
  const wss = new WebSocketServer({ noServer: true });
  srv.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  });
  wss.on('connection', (ws) => setupWSConnection(ws, docId));
  const port = await new Promise<number>((r) =>
    srv.listen(0, '127.0.0.1', () => r((srv.address() as any).port))
  );
  const cleanup = () => { wss.clients.forEach((c) => c.terminate()); wss.close(); srv.close(); };
  return { port, cleanup };
}

/** Connect and buffer the first message so it's never lost */
function connectAndGetFirstMsg(port: number): Promise<{ ws: WebSocket; firstMsg: Buffer }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const t = setTimeout(() => { ws.terminate(); reject(new Error('timeout')); }, 5000);
    ws.once('message', (data: Buffer) => {
      clearTimeout(t);
      resolve({ ws, firstMsg: data });
    });
    ws.on('error', (e) => { clearTimeout(t); reject(e); });
  });
}

function waitMsg(ws: WebSocket, ms = 3000): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('msg timeout')), ms);
    ws.once('message', (raw: Buffer) => { clearTimeout(t); resolve(new Uint8Array(raw)); });
  });
}

describe('WebSocket Server', () => {
  it('should accept connections and send initial sync step1', async () => {
    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws, firstMsg } = await connectAndGetFirstMsg(port);
      const data = new Uint8Array(firstMsg);
      const decoder = decoding.createDecoder(data);
      expect(decoding.readVarUint(decoder)).toBe(MSG_SYNC);
      ws.terminate();
    } finally {
      cleanup();
    }
  });

  it('should respond to client sync step1', async () => {
    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws } = await connectAndGetFirstMsg(port);

      const clientDoc = new Y.Doc();
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeSyncStep1(enc, clientDoc);
      ws.send(encoding.toUint8Array(enc));

      const resp = await waitMsg(ws);
      expect(decoding.readVarUint(decoding.createDecoder(resp))).toBe(MSG_SYNC);
      clientDoc.destroy();
      ws.terminate();
    } finally {
      cleanup();
    }
  });

  it('should broadcast updates to multiple clients', async () => {
    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws: ws1 } = await connectAndGetFirstMsg(port);
      const { ws: ws2 } = await connectAndGetFirstMsg(port);

      await new Promise((r) => setTimeout(r, 100));

      const cDoc = new Y.Doc();
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeSyncStep1(enc, cDoc);
      ws1.send(encoding.toUint8Array(enc));

      await new Promise((r) => setTimeout(r, 200));
      cDoc.destroy();
      ws1.terminate();
      ws2.terminate();
    } finally {
      cleanup();
    }
  });

  it('should handle awareness messages', async () => {
    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws } = await connectAndGetFirstMsg(port);

      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_AWARENESS);
      encoding.writeVarUint8Array(enc, new Uint8Array([1, 0, 1, 123, 125]));
      ws.send(encoding.toUint8Array(enc));

      await new Promise((r) => setTimeout(r, 100));
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.terminate();
    } finally {
      cleanup();
    }
  });

  it('should handle unknown message types gracefully', async () => {
    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws } = await connectAndGetFirstMsg(port);

      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, 99);
      ws.send(encoding.toUint8Array(enc));

      await new Promise((r) => setTimeout(r, 100));
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.terminate();
    } finally {
      cleanup();
    }
  });

  it('should handle malformed messages without crashing', async () => {
    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws } = await connectAndGetFirstMsg(port);
      ws.send(new Uint8Array([255, 255, 255]));
      await new Promise((r) => setTimeout(r, 200));
      ws.terminate();
    } finally {
      cleanup();
    }
  });

  it('should persist state when last client disconnects', async () => {
    const { documentStore } = await import('../store/document-store');
    const mockedSave = vi.mocked(documentStore.saveYDocState);
    mockedSave.mockClear();

    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws } = await connectAndGetFirstMsg(port);
      ws.close();
      await new Promise((r) => setTimeout(r, 500));
      expect(mockedSave).toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('should keep other clients when one disconnects', async () => {
    const { port, cleanup } = await createServer(`doc-${++testId}`);
    try {
      const { ws: ws1 } = await connectAndGetFirstMsg(port);
      const { ws: ws2 } = await connectAndGetFirstMsg(port);

      ws1.close();
      await new Promise((r) => setTimeout(r, 200));
      expect(ws2.readyState).toBe(WebSocket.OPEN);
      ws2.terminate();
    } finally {
      cleanup();
    }
  });
});
