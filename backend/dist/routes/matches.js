"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/matches
 * Get all matches for current user
 */
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const matches = await index_1.prisma.match.findMany({
        where: {
            OR: [
                { userAId: req.user.id },
                { userBId: req.user.id },
            ],
        },
        include: {
            userA: {
                select: {
                    id: true,
                    displayName: true,
                    verifiedSelfie: true,
                    lastActiveAt: true,
                    profile: {
                        include: {
                            photos: {
                                where: { moderationStatus: 'APPROVED', isProfilePic: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
            userB: {
                select: {
                    id: true,
                    displayName: true,
                    verifiedSelfie: true,
                    lastActiveAt: true,
                    profile: {
                        include: {
                            photos: {
                                where: { moderationStatus: 'APPROVED', isProfilePic: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
            messages: {
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1,
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    // Format matches to always show the other user
    const formattedMatches = matches.map(match => {
        const otherUser = match.userAId === req.user.id ? match.userB : match.userA;
        return {
            id: match.id,
            createdAt: match.createdAt,
            user: otherUser,
            lastMessage: match.messages[0] || null,
        };
    });
    res.json({
        success: true,
        matches: formattedMatches,
    });
}));
/**
 * GET /api/matches/:id
 * Get specific match details
 */
router.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const match = await index_1.prisma.match.findFirst({
        where: {
            id,
            OR: [
                { userAId: req.user.id },
                { userBId: req.user.id },
            ],
        },
        include: {
            userA: {
                select: {
                    id: true,
                    displayName: true,
                    verifiedSelfie: true,
                    lastActiveAt: true,
                    profile: {
                        include: {
                            photos: {
                                where: { moderationStatus: 'APPROVED' },
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            },
            userB: {
                select: {
                    id: true,
                    displayName: true,
                    verifiedSelfie: true,
                    lastActiveAt: true,
                    profile: {
                        include: {
                            photos: {
                                where: { moderationStatus: 'APPROVED' },
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!match) {
        throw new errorHandler_1.AppError('Match not found', 404);
    }
    // Get the other user
    const otherUser = match.userAId === req.user.id ? match.userB : match.userA;
    res.json({
        success: true,
        match: {
            id: match.id,
            createdAt: match.createdAt,
            user: otherUser,
        },
    });
}));
/**
 * DELETE /api/matches/:id
 * Unmatch (delete match and associated messages)
 */
router.delete('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Verify match exists and user is part of it
    const match = await index_1.prisma.match.findFirst({
        where: {
            id,
            OR: [
                { userAId: req.user.id },
                { userBId: req.user.id },
            ],
        },
    });
    if (!match) {
        throw new errorHandler_1.AppError('Match not found', 404);
    }
    // Delete match (messages will be cascade deleted)
    await index_1.prisma.match.delete({
        where: { id },
    });
    res.json({
        success: true,
        message: 'Match removed',
    });
}));
exports.default = router;
//# sourceMappingURL=matches.js.map