import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import config from '../config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * Initialize Socket.IO handlers
 */
export function initializeSocketIO(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };

      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive || user.isBanned) {
        return next(new Error('Authentication error: Invalid user'));
      }

      // Attach userId to socket
      socket.userId = user.id;

      // Join user's personal room for notifications
      socket.join(user.id);

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Update user's online status
    if (socket.userId) {
      prisma.user.update({
        where: { id: socket.userId },
        data: { lastActiveAt: new Date() },
      }).catch(console.error);
    }

    // Join match rooms
    socket.on('join_match', async (matchId: string) => {
      try {
        // Verify user is part of this match
        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [
              { userAId: socket.userId },
              { userBId: socket.userId },
            ],
          },
        });

        if (match) {
          socket.join(`match:${matchId}`);
          console.log(`User ${socket.userId} joined match ${matchId}`);
        }
      } catch (error) {
        console.error('Error joining match:', error);
      }
    });

    // Leave match room
    socket.on('leave_match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
      console.log(`User ${socket.userId} left match ${matchId}`);
    });

    // Send message
    socket.on('send_message', async (data: { matchId: string; content: string }) => {
      try {
        const { matchId, content } = data;

        // Validate input
        if (!matchId || !content || content.trim().length === 0) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        if (content.length > 2000) {
          socket.emit('error', { message: 'Message too long (max 2000 characters)' });
          return;
        }

        // Verify match exists and user is part of it
        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [
              { userAId: socket.userId },
              { userBId: socket.userId },
            ],
          },
        });

        if (!match) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            matchId,
            senderId: socket.userId!,
            content: content.trim(),
          },
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        });

        // Emit message to both users in the match
        io.to(`match:${matchId}`).emit('new_message', message);

        // Create notification for other user
        const otherUserId = match.userAId === socket.userId ? match.userBId : match.userAId;
        await prisma.notification.create({
          data: {
            userId: otherUserId,
            type: 'NEW_MESSAGE',
            title: 'New message',
            message: `${message.sender.displayName} sent you a message`,
            data: { matchId, messageId: message.id },
          },
        });

        // Emit notification to other user
        io.to(otherUserId).emit('notification', {
          type: 'NEW_MESSAGE',
          matchId,
          message: `${message.sender.displayName} sent you a message`,
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing_start', async (data: { matchId: string }) => {
      try {
        const { matchId } = data;

        // Verify match
        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [
              { userAId: socket.userId },
              { userBId: socket.userId },
            ],
          },
        });

        if (match) {
          // Emit to match room (excluding sender)
          socket.to(`match:${matchId}`).emit('user_typing', {
            userId: socket.userId,
            matchId,
          });
        }
      } catch (error) {
        console.error('Error in typing_start:', error);
      }
    });

    socket.on('typing_stop', async (data: { matchId: string }) => {
      try {
        const { matchId } = data;

        // Verify match
        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [
              { userAId: socket.userId },
              { userBId: socket.userId },
            ],
          },
        });

        if (match) {
          // Emit to match room (excluding sender)
          socket.to(`match:${matchId}`).emit('user_stopped_typing', {
            userId: socket.userId,
            matchId,
          });
        }
      } catch (error) {
        console.error('Error in typing_stop:', error);
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (data: { matchId: string }) => {
      try {
        const { matchId } = data;

        await prisma.message.updateMany({
          where: {
            matchId,
            senderId: { not: socket.userId },
            readAt: null,
          },
          data: {
            readAt: new Date(),
          },
        });

        // Notify other user that messages were read
        socket.to(`match:${matchId}`).emit('messages_read', { matchId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Get online status
    socket.on('get_online_status', async (userIds: string[]) => {
      try {
        // In production, use Redis to track online users
        // For now, check last active time
        const users = await prisma.user.findMany({
          where: {
            id: { in: userIds },
          },
          select: {
            id: true,
            lastActiveAt: true,
          },
        });

        const onlineStatus = users.reduce((acc, user) => {
          // Consider user online if active in last 5 minutes
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          acc[user.id] = user.lastActiveAt > fiveMinutesAgo;
          return acc;
        }, {} as Record<string, boolean>);

        socket.emit('online_status', onlineStatus);
      } catch (error) {
        console.error('Error getting online status:', error);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Update last active time
      if (socket.userId) {
        prisma.user.update({
          where: { id: socket.userId },
          data: { lastActiveAt: new Date() },
        }).catch(console.error);
      }
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Socket.IO initialized');
}

/**
 * Emit notification to a specific user
 */
export function emitNotification(io: SocketIOServer, userId: string, notification: any) {
  io.to(userId).emit('notification', notification);
}
