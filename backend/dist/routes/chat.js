"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const messagingServer_1 = require("../messaging/messagingServer");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/chat/:matchId/messages?limit=50&offset=0
router.get('/:matchId/messages', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { matchId } = req.params;
    const limit = parseInt(req.query.limit || '50');
    const offset = parseInt(req.query.offset || '0');
    // Verify user is in match
    const match = await prisma.match.findFirst({
        where: {
            id: matchId,
            OR: [{ userAId: userId }, { userBId: userId }],
        },
    });
    if (!match) {
        return res.status(404).json({ success: false, error: 'Match not found or unauthorized' });
    }
    // Fetch messages with pagination (offset-based)
    const messages = await prisma.message.findMany({
        where: { matchId },
        include: {
            sender: {
                select: {
                    id: true,
                    displayName: true,
                    profile: {
                        select: {
                            photos: {
                                where: { isProfilePic: true },
                                select: { url: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
    });
    // Reverse to chronological order
    messages.reverse();
    const formatted = messages.map((msg) => ({
        id: msg.id,
        matchId: msg.matchId,
        senderId: msg.senderId,
        content: msg.content,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
        sender: {
            id: msg.sender.id,
            displayName: msg.sender.displayName,
            profileImage: msg.sender.profile?.photos[0]?.url || null,
        },
    }));
    res.json({ success: true, messages: formatted, hasMore: messages.length === limit });
}));
// POST /api/chat/:matchId/messages
router.post('/:matchId/messages', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { matchId } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ success: false, error: 'Message content required' });
    }
    const match = await prisma.match.findFirst({
        where: {
            id: matchId,
            OR: [{ userAId: userId }, { userBId: userId }],
        },
    });
    if (!match) {
        return res.status(404).json({ success: false, error: 'Match not found or unauthorized' });
    }
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
                    profile: {
                        select: {
                            photos: {
                                where: { isProfilePic: true },
                                select: { url: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });
    // Emit to recipient (if socket server available)
    const recipientId = match.userAId === userId ? match.userBId : match.userAId;
    const io = (0, messagingServer_1.getIO)();
    if (io) {
        io.to(`user_${recipientId}`).emit('new_message', message);
    }
    res.status(201).json({ success: true, message });
}));
exports.default = router;
//# sourceMappingURL=chat.js.map