"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketIO = initializeSocketIO;
exports.emitNotification = emitNotification;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const config_1 = __importDefault(require("../config"));
/**
 * Initialize Socket.IO handlers
 */
function initializeSocketIO(io) {
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
            // Check if user exists and is active
            const user = await index_1.prisma.user.findUnique({
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
        }
        catch (error) {
            next(new Error('Authentication error'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);
        // Update user's online status
        if (socket.userId) {
            index_1.prisma.user.update({
                where: { id: socket.userId },
                data: { lastActiveAt: new Date() },
            }).catch(console.error);
        }
        // Join match rooms
        socket.on('join_match', async (matchId) => {
            try {
                // Verify user is part of this match
                const match = await index_1.prisma.match.findFirst({
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
            }
            catch (error) {
                console.error('Error joining match:', error);
            }
        });
        // Leave match room
        socket.on('leave_match', (matchId) => {
            socket.leave(`match:${matchId}`);
            console.log(`User ${socket.userId} left match ${matchId}`);
        });
        // Send message
        socket.on('send_message', async (data) => {
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
                const match = await index_1.prisma.match.findFirst({
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
                const message = await index_1.prisma.message.create({
                    data: {
                        matchId,
                        senderId: socket.userId,
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
                await index_1.prisma.notification.create({
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
            }
            catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        // Typing indicator
        socket.on('typing_start', async (data) => {
            try {
                const { matchId } = data;
                // Verify match
                const match = await index_1.prisma.match.findFirst({
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
            }
            catch (error) {
                console.error('Error in typing_start:', error);
            }
        });
        socket.on('typing_stop', async (data) => {
            try {
                const { matchId } = data;
                // Verify match
                const match = await index_1.prisma.match.findFirst({
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
            }
            catch (error) {
                console.error('Error in typing_stop:', error);
            }
        });
        // Mark messages as read
        socket.on('mark_read', async (data) => {
            try {
                const { matchId } = data;
                await index_1.prisma.message.updateMany({
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
            }
            catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });
        // Get online status
        socket.on('get_online_status', async (userIds) => {
            try {
                // In production, use Redis to track online users
                // For now, check last active time
                const users = await index_1.prisma.user.findMany({
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
                }, {});
                socket.emit('online_status', onlineStatus);
            }
            catch (error) {
                console.error('Error getting online status:', error);
            }
        });
        // Disconnect handler
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
            // Update last active time
            if (socket.userId) {
                index_1.prisma.user.update({
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
function emitNotification(io, userId, notification) {
    io.to(userId).emit('notification', notification);
}
//# sourceMappingURL=index.js.map