import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './utils/auth.js';
import { default as redisClient } from './services/redis.service.js';
import { checkConnectionLimit, checkMessageLimit, cleanupSocketLimits, startRateLimitCleanup } from './middleware/websocket-rate-limit.js';

export function setupWebSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://bizzautoai.com',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Start periodic rate limit cleanup
  startRateLimitCleanup();

  // Connection rate limiting — prevent IP-based flooding
  io.use(async (socket: Socket, next) => {
    const ip = socket.handshake.address;
    const connCheck = checkConnectionLimit(ip);
    if (!connCheck.allowed) {
      return next(new Error(`Rate limit exceeded. Retry after ${Math.ceil(connCheck.retryAfterMs / 1000)}s.`));
    }
    next();
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token as string, getJwtSecret()) as any;

      // Verify user still exists and is active
      const { prisma } = await import('./db.js');
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true },
      });
      if (!user || !user.isActive) {
        return next(new Error('User not found or deactivated'));
      }

      socket.userId = decoded.userId;
      socket.businessId = decoded.businessId;
      socket.plan = decoded.plan || 'FREE';
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    console.log(`🔌 User connected: ${socket.userId} (Business: ${socket.businessId})`);

    // Join user's business room
    if (socket.businessId) {
      socket.join(`business:${socket.businessId}`);
    }

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Store connection in Redis
    if (redisClient) {
      await redisClient?.hset(`socket:${socket.userId}`, {
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
        plan: socket.plan || 'FREE',
      });
    }

    // Handle real-time messaging
    socket.on('send:message', async (data) => {
      const rateCheck = checkMessageLimit(socket.id, socket.userId);
      if (!rateCheck.allowed) {
        socket.emit('rate_limited', { retryAfterMs: rateCheck.retryAfterMs, event: 'send:message' });
        return;
      }
      const { contactId, message, type } = data;

      // Emit to relevant room
      io.to(`business:${socket.businessId}`).emit('new:message', {
        contactId,
        message,
        type,
        senderId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle typing indicator
    socket.on('typing:start', (data) => {
      const rateCheck = checkMessageLimit(socket.id, socket.userId);
      if (!rateCheck.allowed) return;
      socket.to(`business:${socket.businessId}`).emit('user:typing', {
        userId: socket.userId,
        contactId: data.contactId,
      });
    });

    socket.on('typing:stop', (data) => {
      const rateCheck = checkMessageLimit(socket.id, socket.userId);
      if (!rateCheck.allowed) return;
      socket.to(`business:${socket.businessId}`).emit('user:stopped', {
        userId: socket.userId,
        contactId: data.contactId,
      });
    });

    // Handle order status updates
    socket.on('order:update', async (data) => {
      const rateCheck = checkMessageLimit(socket.id, socket.userId);
      if (!rateCheck.allowed) return;
      const { orderId, status } = data;
      io.to(`business:${socket.businessId}`).emit('order:changed', {
        orderId,
        status,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle CRM lead updates
    socket.on('lead:update', async (data) => {
      const rateCheck = checkMessageLimit(socket.id, socket.userId);
      if (!rateCheck.allowed) return;
      const { contactId, stage, dealValue } = data;
      io.to(`business:${socket.businessId}`).emit('lead:changed', {
        contactId,
        stage,
        dealValue,
        updatedBy: socket.userId,
      });
    });

    // Handle appointment notifications
    socket.on('appointment:reminder', (data) => {
      const rateCheck = checkMessageLimit(socket.id, socket.userId);
      if (!rateCheck.allowed) return;
      io.to(`business:${socket.businessId}`).emit('appointment:alert', {
        ...data,
        notifyAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min before
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
      cleanupSocketLimits(socket.id);
      if (redisClient) {
        await redisClient?.hdel(`socket:${socket.userId}`, 'socketId');
      }
    });
  });

  // Helper function to emit to specific business
  io.emitToBusiness = (businessId: string, event: string, data: any) => {
    io.to(`business:${businessId}`).emit(event, data);
  };

  // Helper function to emit to specific user
  io.emitToUser = (userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  return io;
}

// Event types for type safety
export interface WebSocketEvents {
  'new:message': (data: { contactId: string; message: string; type: string }) => void;
  'order:changed': (data: { orderId: string; status: string }) => void;
  'lead:changed': (data: { contactId: string; stage: string; dealValue: number }) => void;
  'appointment:alert': (data: { id: string; title: string; time: string }) => void;
  'user:typing': (data: { userId: string; contactId: string }) => void;
}