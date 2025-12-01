import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './index';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export const initializeSocketIO = (io: SocketIOServer) => {
  console.log('🔌 Initializing Socket.IO server...');
  
  // Middleware for authentication
  io.use(async (socket: any, next) => {
    try {
      console.log('🔐 Socket authentication attempt...');
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.error('❌ No token provided');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        console.error('❌ Invalid or inactive user:', decoded.id);
        return next(new Error('Invalid or inactive user'));
      }

      socket.userId = user.id;
      socket.user = user;
      console.log('✅ Socket authenticated:', user.displayName, '(', user.id, ')');
      next();
    } catch (error: any) {
      console.error('❌ Socket authentication error:', error.message);
      next(new Error('Authentication failed: ' + error.message));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.displayName} (${socket.userId})`);

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Handle joining match rooms for real-time messaging
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
          socket.join(`match_${matchId}`);
          console.log(`User ${socket.userId} joined match room: ${matchId}`);
        }
      } catch (error) {
        console.error('Error joining match room:', error);
      }
    });

    // Handle leaving match rooms
    socket.on('leave_match', (matchId: string) => {
      socket.leave(`match_${matchId}`);
      console.log(`User ${socket.userId} left match room: ${matchId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data: { matchId: string; content: string }) => {
      try {
        const { matchId, content } = data;

        if (!content || content.trim().length === 0) {
          socket.emit('message_error', { error: 'Message content is required' });
          return;
        }

        if (content.length > 2000) {
          socket.emit('message_error', { error: 'Message is too long (max 2000 characters)' });
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
          socket.emit('message_error', { error: 'Match not found' });
          return;
        }

        // Create message
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

        // Emit message to all users in the match room
        io.to(`match_${matchId}`).emit('new_message', {
          message,
          matchId,
        });

        // Create notification for other user
        const otherUserId = match.userAId === socket.userId ? match.userBId : match.userAId;
        await prisma.notification.create({
          data: {
            userId: otherUserId,
            type: 'NEW_MESSAGE',
            title: 'New message',
            message: `${socket.user?.displayName || 'Someone'} sent you a message`,
            data: { matchId, messageId: message.id },
          },
        });

        // Emit notification to the other user
        io.to(`user_${otherUserId}`).emit('notification', {
          type: 'NEW_MESSAGE',
          title: 'New message',
          message: `${socket.user?.displayName || 'Someone'} sent you a message`,
          data: { matchId, messageId: message.id },
        });

      } catch (error) {
        console.error('Error sending message via socket:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (matchId: string) => {
      socket.to(`match_${matchId}`).emit('user_typing', {
        userId: socket.userId,
        displayName: socket.user?.displayName,
        matchId,
      });
    });

    socket.on('typing_stop', (matchId: string) => {
      socket.to(`match_${matchId}`).emit('user_stop_typing', {
        userId: socket.userId,
        matchId,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.displayName} (${socket.userId})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};