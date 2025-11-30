"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const email_1 = require("../utils/email");
const router = (0, express_1.Router)();
// Apply admin middleware to all routes
router.use(auth_1.authenticate, auth_1.requireAdmin);
/**
 * GET /api/admin/photo-verifications
 * Get photo verification queue
 */
router.get('/photo-verifications', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const where = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        where.status = status;
    }
    const verifications = await index_1.prisma.photoVerification.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                    createdAt: true,
                },
            },
        },
        orderBy: {
            createdAt: 'asc',
        },
        skip: offset,
        take: limit,
    });
    const total = await index_1.prisma.photoVerification.count({ where });
    res.json({
        success: true,
        verifications,
        total,
        hasMore: offset + limit < total,
    });
}));
/**
 * POST /api/admin/photo-verifications/:id/review
 * Approve or reject photo verification
 */
router.post('/photo-verifications/:id/review', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const schema = zod_1.z.object({
        status: zod_1.z.enum(['APPROVED', 'REJECTED']),
        reason: zod_1.z.string().optional(),
    });
    const { status, reason } = schema.parse(req.body);
    const verification = await index_1.prisma.photoVerification.findUnique({
        where: { id },
        include: { user: true },
    });
    if (!verification) {
        throw new errorHandler_1.AppError('Verification not found', 404);
    }
    // Update verification
    await index_1.prisma.photoVerification.update({
        where: { id },
        data: {
            status,
            reason,
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
        },
    });
    // Update user's verified_selfie flag
    await index_1.prisma.user.update({
        where: { id: verification.userId },
        data: {
            verifiedSelfie: status === 'APPROVED',
        },
    });
    // Send notification
    await index_1.prisma.notification.create({
        data: {
            userId: verification.userId,
            type: 'PROFILE_VERIFIED',
            title: status === 'APPROVED' ? 'Verification Approved!' : 'Verification Rejected',
            message: status === 'APPROVED'
                ? 'Your photo verification has been approved!'
                : `Your photo verification was rejected. ${reason || ''}`,
            data: { verificationId: id },
        },
    });
    // Send email
    await (0, email_1.sendPhotoVerificationEmail)(verification.user.email, status === 'APPROVED' ? 'approved' : 'rejected', reason);
    res.json({
        success: true,
        message: 'Verification reviewed',
    });
}));
/**
 * GET /api/admin/reports
 * Get user reports
 */
router.get('/reports', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const where = {};
    if (status && ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'].includes(status)) {
        where.status = status;
    }
    const reports = await index_1.prisma.report.findMany({
        where,
        include: {
            reporter: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                },
            },
            reported: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                    isBanned: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: offset,
        take: limit,
    });
    const total = await index_1.prisma.report.count({ where });
    res.json({
        success: true,
        reports,
        total,
        hasMore: offset + limit < total,
    });
}));
/**
 * POST /api/admin/reports/:id/review
 * Review a report
 */
router.post('/reports/:id/review', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const schema = zod_1.z.object({
        status: zod_1.z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
        resolution: zod_1.z.string(),
    });
    const { status, resolution } = schema.parse(req.body);
    const report = await index_1.prisma.report.findUnique({
        where: { id },
    });
    if (!report) {
        throw new errorHandler_1.AppError('Report not found', 404);
    }
    await index_1.prisma.report.update({
        where: { id },
        data: {
            status,
            resolution,
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
        },
    });
    res.json({
        success: true,
        message: 'Report reviewed',
    });
}));
/**
 * POST /api/admin/users/:id/ban
 * Ban a user
 */
router.post('/users/:id/ban', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
        throw new errorHandler_1.AppError('Ban reason is required', 400);
    }
    const user = await index_1.prisma.user.findUnique({
        where: { id },
    });
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    if (user.role === 'ADMIN') {
        throw new errorHandler_1.AppError('Cannot ban admin users', 403);
    }
    await index_1.prisma.user.update({
        where: { id },
        data: {
            isBanned: true,
            banReason: reason,
        },
    });
    // Create notification
    await index_1.prisma.notification.create({
        data: {
            userId: id,
            type: 'ACCOUNT_WARNING',
            title: 'Account Banned',
            message: `Your account has been banned. Reason: ${reason}`,
            data: { reason },
        },
    });
    res.json({
        success: true,
        message: 'User banned',
    });
}));
/**
 * POST /api/admin/users/:id/unban
 * Unban a user
 */
router.post('/users/:id/unban', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await index_1.prisma.user.update({
        where: { id },
        data: {
            isBanned: false,
            banReason: null,
        },
    });
    // Create notification
    await index_1.prisma.notification.create({
        data: {
            userId: id,
            type: 'ACCOUNT_WARNING',
            title: 'Account Unbanned',
            message: 'Your account has been unbanned. Please follow community guidelines.',
            data: {},
        },
    });
    res.json({
        success: true,
        message: 'User unbanned',
    });
}));
/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalUsers, activeUsers, bannedUsers, totalMatches, totalMessages, pendingVerifications, pendingReports,] = await Promise.all([
        index_1.prisma.user.count(),
        index_1.prisma.user.count({ where: { isActive: true, isBanned: false } }),
        index_1.prisma.user.count({ where: { isBanned: true } }),
        index_1.prisma.match.count(),
        index_1.prisma.message.count(),
        index_1.prisma.photoVerification.count({ where: { status: 'PENDING' } }),
        index_1.prisma.report.count({ where: { status: 'PENDING' } }),
    ]);
    // Get users created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await index_1.prisma.user.count({
        where: {
            createdAt: {
                gte: sevenDaysAgo,
            },
        },
    });
    res.json({
        success: true,
        stats: {
            totalUsers,
            activeUsers,
            bannedUsers,
            totalMatches,
            totalMessages,
            pendingVerifications,
            pendingReports,
            newUsersThisWeek,
        },
    });
}));
/**
 * GET /api/admin/analytics
 * Get detailed analytics data
 */
router.get('/analytics', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    // Get daily user signups
    const dailySignups = await index_1.prisma.$queryRaw `
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    // Get daily matches
    const dailyMatches = await index_1.prisma.$queryRaw `
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM matches
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    // Get daily messages
    const dailyMessages = await index_1.prisma.$queryRaw `
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM messages
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    // Get user distribution by department
    const usersByDepartment = await index_1.prisma.$queryRaw `
      SELECT p.department, COUNT(*)::bigint as count
      FROM profiles p
      WHERE p.department IS NOT NULL
      GROUP BY p.department
      ORDER BY count DESC
      LIMIT 10
    `;
    // Get user distribution by year
    const usersByYear = await index_1.prisma.$queryRaw `
      SELECT p.year, COUNT(*)::bigint as count
      FROM profiles p
      WHERE p.year IS NOT NULL
      GROUP BY p.year
      ORDER BY p.year ASC
    `;
    // Get match rate (users with at least one match)
    const usersWithMatches = await index_1.prisma.$queryRaw `
      SELECT COUNT(DISTINCT user_id)::bigint as count
      FROM (
        SELECT user_a_id as user_id FROM matches
        UNION
        SELECT user_b_id as user_id FROM matches
      ) as matched_users
    `;
    const totalUsers = await index_1.prisma.user.count();
    const matchRate = totalUsers > 0 ? (Number(usersWithMatches[0]?.count || 0) / totalUsers) * 100 : 0;
    // Get most active users (by messages sent)
    const mostActiveUsers = await index_1.prisma.$queryRaw `
      SELECT u.id as user_id, u.email, u.display_name, COUNT(m.id)::bigint as message_count
      FROM users u
      JOIN messages m ON m.sender_id = u.id
      GROUP BY u.id, u.email, u.display_name
      ORDER BY message_count DESC
      LIMIT 10
    `;
    res.json({
        success: true,
        analytics: {
            dailySignups: dailySignups.map(d => ({ date: d.date, count: Number(d.count) })),
            dailyMatches: dailyMatches.map(d => ({ date: d.date, count: Number(d.count) })),
            dailyMessages: dailyMessages.map(d => ({ date: d.date, count: Number(d.count) })),
            usersByDepartment: usersByDepartment.map(d => ({ department: d.department, count: Number(d.count) })),
            usersByYear: usersByYear.map(d => ({ year: d.year, count: Number(d.count) })),
            matchRate: matchRate.toFixed(2),
            mostActiveUsers: mostActiveUsers.map(u => ({
                userId: u.user_id,
                email: u.email,
                displayName: u.display_name,
                messageCount: Number(u.message_count)
            })),
        },
    });
}));
/**
 * GET /api/admin/users
 * Get all users (with pagination)
 */
router.get('/users', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search;
    const where = {};
    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
        ];
    }
    const users = await index_1.prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            isActive: true,
            isBanned: true,
            banReason: true,
            verifiedSelfie: true,
            createdAt: true,
            lastActiveAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: offset,
        take: limit,
    });
    const total = await index_1.prisma.user.count({ where });
    res.json({
        success: true,
        users,
        total,
        hasMore: offset + limit < total,
    });
}));
/**
 * GET /api/admin/users/:id/activity
 * Get user activity logs
 */
router.get('/users/:id/activity', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const user = await index_1.prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            displayName: true,
            lastActiveAt: true,
            createdAt: true,
        },
    });
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    // Get recent likes given
    const likesGiven = await index_1.prisma.like.findMany({
        where: { fromUserId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            toUser: {
                select: { id: true, displayName: true, email: true },
            },
        },
    });
    // Get recent likes received
    const likesReceived = await index_1.prisma.like.findMany({
        where: { toUserId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            fromUser: {
                select: { id: true, displayName: true, email: true },
            },
        },
    });
    // Get matches
    const matches = await index_1.prisma.match.findMany({
        where: {
            OR: [{ userAId: id }, { userBId: id }],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });
    // Get message count
    const messagesSent = await index_1.prisma.message.count({
        where: { senderId: id },
    });
    // Get reports made by user
    const reportsMade = await index_1.prisma.report.count({
        where: { reporterId: id },
    });
    // Get reports against user
    const reportsAgainst = await index_1.prisma.report.count({
        where: { reportedId: id },
    });
    res.json({
        success: true,
        user,
        activity: {
            likesGiven,
            likesReceived,
            matches,
            messagesSent,
            reportsMade,
            reportsAgainst,
        },
    });
}));
/**
 * POST /api/admin/users/bulk-action
 * Perform bulk actions on users
 */
router.post('/users/bulk-action', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        action: zod_1.z.enum(['ban', 'unban', 'delete']),
        userIds: zod_1.z.array(zod_1.z.string()),
        reason: zod_1.z.string().optional(),
    });
    const { action, userIds, reason } = schema.parse(req.body);
    if (action === 'ban') {
        if (!reason) {
            throw new errorHandler_1.AppError('Reason is required for ban action', 400);
        }
        await index_1.prisma.user.updateMany({
            where: {
                id: { in: userIds },
                role: { not: 'ADMIN' },
            },
            data: {
                isBanned: true,
                banReason: reason,
            },
        });
    }
    else if (action === 'unban') {
        await index_1.prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: {
                isBanned: false,
                banReason: null,
            },
        });
    }
    else if (action === 'delete') {
        // Soft delete - just mark as inactive
        await index_1.prisma.user.updateMany({
            where: {
                id: { in: userIds },
                role: { not: 'ADMIN' },
            },
            data: {
                isActive: false,
            },
        });
    }
    res.json({
        success: true,
        message: `Bulk ${action} completed for ${userIds.length} users`,
    });
}));
/**
 * POST /api/admin/broadcast
 * Send notification to all users or specific users
 */
router.post('/broadcast', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        title: zod_1.z.string(),
        message: zod_1.z.string(),
        type: zod_1.z.enum(['ANNOUNCEMENT', 'MAINTENANCE', 'UPDATE']),
        userIds: zod_1.z.array(zod_1.z.string()).optional(),
    });
    const { title, message, type, userIds } = schema.parse(req.body);
    let targetUserIds;
    if (userIds && userIds.length > 0) {
        targetUserIds = userIds;
    }
    else {
        // Get all active users
        const users = await index_1.prisma.user.findMany({
            where: { isActive: true, isBanned: false },
            select: { id: true },
        });
        targetUserIds = users.map(u => u.id);
    }
    // Create notifications for all target users
    await index_1.prisma.notification.createMany({
        data: targetUserIds.map(userId => ({
            userId,
            type: type,
            title,
            message,
            data: {},
        })),
    });
    res.json({
        success: true,
        message: `Broadcast sent to ${targetUserIds.length} users`,
    });
}));
exports.default = router;
//# sourceMappingURL=admin.js.map