"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
/**
 * POST /api/likes
 * Like a user
 */
router.post('/', auth_1.authenticate, rateLimiter_1.likeRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { toUserId } = req.body;
    if (!toUserId) {
        throw new errorHandler_1.AppError('toUserId is required', 400);
    }
    // Can't like yourself
    if (toUserId === req.user.id) {
        throw new errorHandler_1.AppError('Cannot like yourself', 400);
    }
    // Check if target user exists and is active
    const targetUser = await index_1.prisma.user.findUnique({
        where: { id: toUserId, isActive: true, isBanned: false },
    });
    if (!targetUser) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    // Check if already liked
    const existingLike = await index_1.prisma.like.findUnique({
        where: {
            fromUserId_toUserId: {
                fromUserId: req.user.id,
                toUserId,
            },
        },
    });
    if (existingLike) {
        return res.json({
            success: true,
            message: 'Already liked',
            isMatch: false,
        });
    }
    // Create like
    await index_1.prisma.like.create({
        data: {
            fromUserId: req.user.id,
            toUserId,
        },
    });
    // Check if it's a mutual like (match)
    const reverseLike = await index_1.prisma.like.findUnique({
        where: {
            fromUserId_toUserId: {
                fromUserId: toUserId,
                toUserId: req.user.id,
            },
        },
    });
    let match = null;
    if (reverseLike) {
        // Create match (ensure userA id is always smaller for consistency)
        const [userAId, userBId] = [req.user.id, toUserId].sort();
        match = await index_1.prisma.match.create({
            data: {
                userAId,
                userBId,
            },
            include: {
                userA: {
                    select: {
                        id: true,
                        displayName: true,
                        verifiedSelfie: true,
                    },
                },
                userB: {
                    select: {
                        id: true,
                        displayName: true,
                        verifiedSelfie: true,
                    },
                },
            },
        });
        // Create notifications for both users
        await index_1.prisma.notification.createMany({
            data: [
                {
                    userId: req.user.id,
                    type: 'NEW_MATCH',
                    title: 'New Match!',
                    message: `You matched with ${targetUser.displayName}`,
                    data: { matchId: match.id, userId: toUserId },
                },
                {
                    userId: toUserId,
                    type: 'NEW_MATCH',
                    title: 'New Match!',
                    message: `You matched with ${req.user.email.split('@')[0]}`,
                    data: { matchId: match.id, userId: req.user.id },
                },
            ],
        });
        // Match notification created above
    }
    else {
        // Create notification for liked user
        await index_1.prisma.notification.create({
            data: {
                userId: toUserId,
                type: 'LIKE_RECEIVED',
                title: 'Someone liked you!',
                message: 'You have a new like',
                data: { userId: req.user.id },
            },
        });
    }
    res.json({
        success: true,
        isMatch: !!match,
        match,
    });
}));
/**
 * DELETE /api/likes/:userId
 * Unlike a user
 */
router.delete('/:userId', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    await index_1.prisma.like.delete({
        where: {
            fromUserId_toUserId: {
                fromUserId: req.user.id,
                toUserId: userId,
            },
        },
    });
    res.json({
        success: true,
        message: 'Like removed',
    });
}));
/**
 * GET /api/likes/received
 * Get users who liked me
 */
router.get('/received', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const likes = await index_1.prisma.like.findMany({
        where: {
            toUserId: req.user.id,
        },
        include: {
            fromUser: {
                select: {
                    id: true,
                    displayName: true,
                    verifiedSelfie: true,
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
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    // Check if each like has a mutual match
    const likesWithMatchStatus = await Promise.all(likes.map(async (like) => {
        // Check if there's a mutual like (match)
        const reverseLike = await index_1.prisma.like.findUnique({
            where: {
                fromUserId_toUserId: {
                    fromUserId: req.user.id,
                    toUserId: like.fromUserId,
                },
            },
        });
        return {
            ...like,
            isMatched: !!reverseLike,
        };
    }));
    res.json({
        success: true,
        likes: likesWithMatchStatus,
    });
}));
/**
 * GET /api/likes/given
 * Get users I liked
 */
router.get('/given', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const likes = await index_1.prisma.like.findMany({
        where: {
            fromUserId: req.user.id,
        },
        include: {
            toUser: {
                select: {
                    id: true,
                    displayName: true,
                    verifiedSelfie: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    res.json({
        success: true,
        likes,
    });
}));
exports.default = router;
//# sourceMappingURL=likes.js.map