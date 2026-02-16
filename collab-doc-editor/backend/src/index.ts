import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { setupWSConnection } from './ws-server';
import { documentsRouter } from './routes/documents';
import { documentStore } from './store/document-store';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import url from 'url';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/documents', documentsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request: IncomingMessage, socket, head) => {
  const pathname = url.parse(request.url || '').pathname || '';

  if (pathname.startsWith('/collaboration/')) {
    const docId = pathname.split('/collaboration/')[1];
    if (!docId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit('connection', ws, request, docId);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, _request: IncomingMessage, docId: string) => {
  setupWSConnection(ws, docId);
});

documentStore.init().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log(`WebSocket server ready for collaboration`);
  });
});
