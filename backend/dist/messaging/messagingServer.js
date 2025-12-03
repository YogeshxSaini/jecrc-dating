"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnlineUsers = exports.getIO = exports.initializeMessagingServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// In-memory storage for online users (use Redis in production for scaling)
const onlineUsers = new Map();
let ioServer = null;
const initializeMessagingServer = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'https://dayalcolonizers.xyz',
                /\.pages\.dev$/,
                /\.onrender\.com$/,
            ],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            // Support tokens with optional 'Bearer ' prefix
            if (token.startsWith('Bearer ')) {
                token = token.slice('Bearer '.length);
            }
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
            const resolvedUserId = decoded.userId || decoded.id;
            if (!resolvedUserId || typeof resolvedUserId !== 'string') {
                return next(new Error('Authentication failed: invalid token payload'));
            }
            socket.userId = resolvedUserId;
            console.log(`User ${resolvedUserId} authenticated on socket ${socket.id}`);
            next();
        }
        catch (error) {
            console.error('Socket authentication error:', error?.name || 'Error', error?.message || error);
            try {
                // Provide more context if possible
                const raw = socket.handshake.auth.token;
                console.warn('Socket auth context:', {
                    hasToken: !!raw,
                    tokenStartsWithBearer: raw ? raw.startsWith('Bearer ') : false,
                    origin: (socket.handshake.headers && socket.handshake.headers.origin) || 'unknown',
                });
            }
            catch { }
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', async (socket) => {
        const authSocket = socket;
        const userId = authSocket.userId;
        console.log(`User ${userId} connected with socket ${socket.id}`);
        // Mark user as online
        onlineUsers.set(userId, {
            userId,
            socketId: socket.id,
            connectedAt: new Date(),
        });
        // Join user's personal room
        socket.join(`user_${userId}`);
        // Notify user's matches that they are online
        try {
            const matches = await prisma.match.findMany({
                where: {
                    OR: [{ userAId: userId }, { userBId: userId }],
                },
                select: {
                    id: true,
                    userAId: true,
                    userBId: true,
                },
            });
            matches.forEach((match) => {
                const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
                io.to(`user_${otherUserId}`).emit('user_online', { userId });
            });
            // Mark undelivered messages as delivered per match and notify senders
            const deliveredAt = new Date();
            for (const match of matches) {
                const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
                const result = await prisma.message.updateMany({
                    where: {
                        matchId: match.id,
                        senderId: { not: userId },
                        deliveredAt: null,
                    },
                    data: { deliveredAt },
                });
                // If any messages were updated, notify the sender(s) in that match
                if (result.count && result.count > 0) {
                    io.to(`user_${otherUserId}`).emit('message_delivered', {
                        matchId: match.id,
                        deliveredAt: deliveredAt.toISOString(),
                    });
                }
            }
        }
        catch (error) {
            console.error('Error notifying online status:', error);
        }
        // Handle sending messages
        socket.on('send_message', async (data, callback) => {
            try {
                const { matchId, content } = data || {};
                if (!matchId || typeof matchId !== 'string') {
                    callback?.({ error: 'Invalid matchId' });
                    return;
                }
                if (!content || typeof content !== 'string' || !content.trim()) {
                    callback?.({ error: 'Message content required' });
                    return;
                }
                console.log(`User ${userId} sending message to match ${matchId} (socket ${socket.id})`);
                // Verify match exists and user is part of it
                const match = await prisma.match.findFirst({
                    where: {
                        id: matchId,
                        OR: [{ userAId: userId }, { userBId: userId }],
                    },
                    include: {
                        userA: {
                            select: {
                                id: true,
                                displayName: true,
                            },
                        },
                        userB: {
                            select: {
                                id: true,
                                displayName: true,
                            },
                        },
                    },
                });
                if (!match) {
                    console.warn('send_message: Match not found or unauthorized', JSON.stringify({ userId, matchId }, null, 2));
                    callback?.({ error: 'Match not found or unauthorized' });
                    return;
                }
                // Create message
                const message = await prisma.message.create({
                    data: {
                        matchId,
                        senderId: userId,
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
                // Determine recipient
                const recipientId = match.userAId === userId ? match.userBId : match.userAId;
                // Check if recipient is online and mark as delivered if they are
                const isRecipientOnline = onlineUsers.has(recipientId);
                let messageWithDelivery = message;
                if (isRecipientOnline) {
                    // Mark as delivered immediately if recipient is online
                    messageWithDelivery = await prisma.message.update({
                        where: { id: message.id },
                        data: { deliveredAt: new Date() },
                        include: {
                            sender: {
                                select: {
                                    id: true,
                                    displayName: true,
                                },
                            },
                        },
                    });
                }
                // Send message to recipient
                io.to(`user_${recipientId}`).emit('new_message', messageWithDelivery);
                // Also send to sender so they see their own message with delivery status
                io.to(`user_${userId}`).emit('new_message', messageWithDelivery);
                // Send confirmation back to sender
                callback?.({ success: true, message: messageWithDelivery });
                console.log(`Message sent successfully: ${message.id}`);
            }
            catch (error) {
                console.error('Error sending message:', error);
                callback?.({ error: 'Failed to send message' });
            }
        });
        // Handle marking messages as read
        socket.on('mark_as_read', async (data) => {
            try {
                console.log(`User ${userId} marking messages as read in match ${data.matchId}`);
                // Verify match exists
                const match = await prisma.match.findFirst({
                    where: {
                        id: data.matchId,
                        OR: [{ userAId: userId }, { userBId: userId }],
                    },
                });
                if (!match) {
                    console.error('Match not found or unauthorized');
                    return;
                }
                // Mark all unread messages from the other user as read
                const readAt = new Date();
                await prisma.message.updateMany({
                    where: {
                        matchId: data.matchId,
                        senderId: { not: userId },
                        readAt: null,
                    },
                    data: { readAt },
                });
                // Determine the other user
                const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
                // Notify sender that messages were read
                io.to(`user_${otherUserId}`).emit('message_read', {
                    matchId: data.matchId,
                    readAt: readAt.toISOString(),
                });
                console.log(`Messages marked as read in match ${data.matchId}`);
            }
            catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });
        // Handle typing indicator
        socket.on('typing', async (data) => {
            try {
                // Verify match
                const match = await prisma.match.findFirst({
                    where: {
                        id: data.matchId,
                        OR: [{ userAId: userId }, { userBId: userId }],
                    },
                });
                if (!match)
                    return;
                const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { displayName: true },
                });
                io.to(`user_${otherUserId}`).emit('user_typing', {
                    matchId: data.matchId,
                    userId,
                    userName: user?.displayName || 'User',
                });
            }
            catch (error) {
                console.error('Error handling typing indicator:', error);
            }
        });
        // Handle stop typing indicator
        socket.on('stop_typing', async (data) => {
            try {
                const match = await prisma.match.findFirst({
                    where: {
                        id: data.matchId,
                        OR: [{ userAId: userId }, { userBId: userId }],
                    },
                });
                if (!match)
                    return;
                const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
                io.to(`user_${otherUserId}`).emit('user_stopped_typing', {
                    matchId: data.matchId,
                    userId,
                });
            }
            catch (error) {
                console.error('Error handling stop typing indicator:', error);
            }
        });
        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`User ${userId} disconnected (socket ${socket.id})`);
            // Remove from online users
            onlineUsers.delete(userId);
            // Notify user's matches that they are offline
            try {
                const matches = await prisma.match.findMany({
                    where: {
                        OR: [{ userAId: userId }, { userBId: userId }],
                    },
                    select: {
                        userAId: true,
                        userBId: true,
                    },
                });
                matches.forEach((match) => {
                    const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
                    io.to(`user_${otherUserId}`).emit('user_offline', { userId });
                });
            }
            catch (error) {
                console.error('Error notifying offline status:', error);
            }
        });
    });
    console.log('Messaging server initialized');
    ioServer = io;
    return io;
};
exports.initializeMessagingServer = initializeMessagingServer;
const getIO = () => ioServer;
exports.getIO = getIO;
const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};
exports.getOnlineUsers = getOnlineUsers;
//# sourceMappingURL=messagingServer.js.map