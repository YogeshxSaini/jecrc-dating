"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/discover
 * Get discovery feed - users to potentially match with
 */
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    // Parse filter parameters from query string
    const departmentsParam = req.query.departments;
    const yearsParam = req.query.years;
    const interestsParam = req.query.interests;
    const departments = departmentsParam ? departmentsParam.split(',').map(d => d.trim()) : [];
    const years = yearsParam ? yearsParam.split(',').map(y => y.trim()) : [];
    const interests = interestsParam ? interestsParam.split(',').map(i => i.trim()) : [];
    // Get current user's profile to filter by preferences
    const currentProfile = await index_1.prisma.profile.findUnique({
        where: { userId: req.user.id },
    });
    // Get IDs of users already liked or matched
    const likedUserIds = await index_1.prisma.like.findMany({
        where: { fromUserId: req.user.id },
        select: { toUserId: true },
    });
    const likedIds = likedUserIds.map(like => like.toUserId);
    // Get IDs of users already passed
    const passedUserIds = await index_1.prisma.pass.findMany({
        where: { fromUserId: req.user.id },
        select: { toUserId: true },
    });
    const passedIds = passedUserIds.map(pass => pass.toUserId);
    // Combine liked and passed IDs to exclude
    const excludedIds = [...likedIds, ...passedIds];
    // Build filter conditions
    const whereConditions = {
        id: {
            not: req.user.id, // Exclude self
            notIn: excludedIds, // Exclude already liked/passed users
        },
        isActive: true,
        isBanned: false,
    };
    // Build profile filter conditions
    const profileConditions = {};
    // Filter by lookingFor preference if set
    if (currentProfile?.lookingFor) {
        profileConditions.gender = currentProfile.lookingFor;
    }
    // Filter by department if specified
    if (departments.length > 0) {
        profileConditions.department = { in: departments };
    }
    // Filter by year if specified
    if (years.length > 0) {
        profileConditions.year = { in: years };
    }
    // Filter by interests if specified (user must have at least one of the selected interests)
    if (interests.length > 0) {
        profileConditions.interests = {
            hasSome: interests,
        };
    }
    // Apply profile filters if any exist
    if (Object.keys(profileConditions).length > 0) {
        whereConditions.profile = profileConditions;
    }
    // Get ALL potential matches (no limit for true randomization)
    const users = await index_1.prisma.user.findMany({
        where: whereConditions,
        select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
            profile: {
                include: {
                    photos: {
                        where: { moderationStatus: 'APPROVED' },
                        orderBy: { order: 'asc' },
                    },
                },
            },
        },
    });
    // Filter out users without profiles
    const usersWithProfiles = users.filter(user => user.profile);
    // Randomize ALL users using Fisher-Yates shuffle for better distribution
    const shuffled = [...usersWithProfiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Apply pagination after randomization
    const paginatedUsers = shuffled.slice(offset, offset + limit);
    res.json({
        success: true,
        users: paginatedUsers,
        count: paginatedUsers.length,
        hasMore: shuffled.length > offset + limit,
    });
}));
/**
 * GET /api/discover/:userId
 * Get detailed profile for a user in discovery
 */
router.get('/:userId', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    if (userId === req.user.id) {
        throw new errorHandler_1.AppError('Cannot view your own profile in discovery', 400);
    }
    const user = await index_1.prisma.user.findUnique({
        where: {
            id: userId,
            isActive: true,
            isBanned: false,
        },
        select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
            profile: {
                include: {
                    photos: {
                        where: { moderationStatus: 'APPROVED' },
                        orderBy: { order: 'asc' },
                    },
                },
            },
        },
    });
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    res.json({
        success: true,
        user,
    });
}));
/**
 * POST /api/discover/pass/:userId
 * Record that current user passed/swiped left on a profile
 */
router.post('/pass/:userId', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    if (userId === req.user.id) {
        throw new errorHandler_1.AppError('Cannot pass on your own profile', 400);
    }
    // Check if user exists
    const targetUser = await index_1.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!targetUser) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    // Create pass record (upsert to handle duplicates gracefully)
    await index_1.prisma.pass.upsert({
        where: {
            fromUserId_toUserId: {
                fromUserId: req.user.id,
                toUserId: userId,
            },
        },
        create: {
            fromUserId: req.user.id,
            toUserId: userId,
        },
        update: {}, // No updates needed if already exists
    });
    res.json({
        success: true,
        message: 'Pass recorded',
    });
}));
exports.default = router;
//# sourceMappingURL=discover.js.map