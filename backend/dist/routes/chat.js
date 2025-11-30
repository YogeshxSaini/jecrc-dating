"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/chat/:matchId/messages
 * Get messages for a match
 */
router.get('/:matchId/messages', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { matchId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    // Verify user is part of this match
    const match = await index_1.prisma.match.findFirst({
        where: {
            id: matchId,
            OR: [
                { userAId: req.user.id },
                { userBId: req.user.id },
            ],
        },
    });
    if (!match) {
        throw new errorHandler_1.AppError('Match not found', 404);
    }
    // Get messages
    const messages = await index_1.prisma.message.findMany({
        where: { matchId },
        include: {
            sender: {
                select: {
                    id: true,
                    displayName: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: offset,
        take: limit,
    });
    // Mark messages as read
    await index_1.prisma.message.updateMany({
        where: {
            matchId,
            senderId: {
                not: req.user.id,
            },
            readAt: null,
        },
        data: {
            readAt: new Date(),
        },
    });
    res.json({
        success: true,
        messages: messages.reverse(), // Return in chronological order
        hasMore: messages.length === limit,
    });
}));
/**
 * POST /api/chat/:matchId/messages
 * Send a message (also handled via Socket.IO, but this is REST fallback)
 */
router.post('/:matchId/messages', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { matchId } = req.params;
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
        throw new errorHandler_1.AppError('Message content is required', 400);
    }
    if (content.length > 2000) {
        throw new errorHandler_1.AppError('Message is too long (max 2000 characters)', 400);
    }
    // Verify match exists and user is part of it
    const match = await index_1.prisma.match.findFirst({
        where: {
            id: matchId,
            OR: [
                { userAId: req.user.id },
                { userBId: req.user.id },
            ],
        },
    });
    if (!match) {
        throw new errorHandler_1.AppError('Match not found', 404);
    }
    // Create message
    const message = await index_1.prisma.message.create({
        data: {
            matchId,
            senderId: req.user.id,
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
    // Create notification for other user
    const otherUserId = match.userAId === req.user.id ? match.userBId : match.userAId;
    await index_1.prisma.notification.create({
        data: {
            userId: otherUserId,
            type: 'NEW_MESSAGE',
            title: 'New message',
            message: `${req.user.email.split('@')[0]} sent you a message`,
            data: { matchId, messageId: message.id },
        },
    });
    res.json({
        success: true,
        message,
    });
}));
/**
 * GET /api/chat/:matchId/typing
 * Get typing status (in production, use Socket.IO for real-time)
 */
router.get('/:matchId/typing', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // This is a placeholder - typing indicators are handled via Socket.IO
    res.json({
        success: true,
        typing: false,
    });
}));
exports.default = router;
//# sourceMappingURL=chat.js.map