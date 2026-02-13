import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../middleware/auth';

let io: Server;

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    console.log(`[Socket] User connected: ${user.email} (${socket.id})`);

    // Join an image room for real-time updates
    socket.on('join:image', (data: { imageId: string }) => {
      if (data.imageId) {
        socket.join(`image:${data.imageId}`);
        console.log(`[Socket] ${user.email} joined image:${data.imageId}`);
      }
    });

    // Leave an image room
    socket.on('leave:image', (data: { imageId: string }) => {
      if (data.imageId) {
        socket.leave(`image:${data.imageId}`);
        console.log(`[Socket] ${user.email} left image:${data.imageId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${user.email} (${socket.id})`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
}
