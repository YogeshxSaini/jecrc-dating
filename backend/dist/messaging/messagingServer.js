"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnlineUsers = exports.getIO = exports.initializeMessagingServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            console.log(`User ${decoded.userId} authenticated on socket ${socket.id}`);
            next();
        }
        catch (error) {
            console.error('Socket authentication error:', error);
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
                    userAId: true,
                    userBId: true,
                },
            });
            matches.forEach((match) => {
                const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
                io.to(`user_${otherUserId}`).emit('user_online', { userId });
            });
        }
        catch (error) {
            console.error('Error notifying online status:', error);
        }
        // Handle sending messages
        socket.on('send_message', async (data, callback) => {
            try {
                console.log(`User ${userId} sending message to match ${data.matchId}`);
                // Verify match exists and user is part of it
                const match = await prisma.match.findFirst({
                    where: {
                        id: data.matchId,
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
                    callback?.({ error: 'Match not found or unauthorized' });
                    return;
                }
                // Create message
                const message = await prisma.message.create({
                    data: {
                        matchId: data.matchId,
                        senderId: userId,
                        content: data.content.trim(),
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
                // Send message to recipient
                io.to(`user_${recipientId}`).emit('new_message', message);
                // Send confirmation back to sender
                callback?.({ success: true, message });
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