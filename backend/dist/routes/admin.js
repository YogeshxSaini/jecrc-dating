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
    // Log action
    await createAuditLog(req.user.id, 'BAN_USER', 'USER', id, { reason, email: user.email }, req);
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
    const user = await index_1.prisma.user.findUnique({ where: { id } });
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
    // Log action
    await createAuditLog(req.user.id, 'UNBAN_USER', 'USER', id, { email: user?.email }, req);
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
    const department = req.query.department;
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const verified = req.query.verified;
    const banned = req.query.banned;
    const activityLevel = req.query.activityLevel;
    const where = {};
    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
        ];
    }
    // Advanced filters
    if (department) {
        where.profile = { department };
    }
    if (year !== undefined) {
        where.profile = { ...where.profile, year };
    }
    if (verified === 'true') {
        where.verifiedSelfie = true;
    }
    else if (verified === 'false') {
        where.verifiedSelfie = false;
    }
    if (banned === 'true') {
        where.isBanned = true;
    }
    else if (banned === 'false') {
        where.isBanned = false;
    }
    if (activityLevel === 'active') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        where.lastActiveAt = { gte: sevenDaysAgo };
    }
    else if (activityLevel === 'inactive') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        where.lastActiveAt = { lt: thirtyDaysAgo };
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
            profile: {
                select: {
                    department: true,
                    year: true,
                },
            },
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
        include: {
            userA: {
                select: { id: true, displayName: true, email: true },
            },
            userB: {
                select: { id: true, displayName: true, email: true },
            },
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
/**
 * GET /api/admin/chats
 * Get all conversations for monitoring
 */
router.get('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search;
    // Get all matches with recent messages
    const matches = await index_1.prisma.match.findMany({
        include: {
            userA: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                },
            },
            userB: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                },
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: offset,
        take: limit,
    });
    const total = await index_1.prisma.match.count();
    res.json({
        success: true,
        matches,
        total,
        hasMore: offset + limit < total,
    });
}));
/**
 * GET /api/admin/chats/:matchId/messages
 * Get all messages for a specific match
 */
router.get('/chats/:matchId/messages', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { matchId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const match = await index_1.prisma.match.findUnique({
        where: { id: matchId },
        include: {
            userA: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                },
            },
            userB: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                },
            },
        },
    });
    if (!match) {
        throw new errorHandler_1.AppError('Match not found', 404);
    }
    const messages = await index_1.prisma.message.findMany({
        where: { matchId },
        include: {
            sender: {
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
    });
    res.json({
        success: true,
        match,
        messages,
    });
}));
/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering
 */
router.get('/audit-logs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const action = req.query.action;
    const adminId = req.query.adminId;
    const where = {};
    if (action)
        where.action = action;
    if (adminId)
        where.adminId = adminId;
    const logs = await index_1.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
    });
    const total = await index_1.prisma.auditLog.count({ where });
    res.json({
        success: true,
        logs,
        total,
    });
}));
/**
 * POST /api/admin/audit-logs
 * Create audit log (internal use)
 */
async function createAuditLog(adminId, action, targetType, targetId, details, req) {
    await index_1.prisma.auditLog.create({
        data: {
            adminId,
            action,
            targetType,
            targetId,
            details,
            ipAddress: req?.ip || req?.headers['x-forwarded-for'] || null,
            userAgent: req?.headers['user-agent'] || null,
        },
    });
}
/**
 * GET /api/admin/settings
 * Get system settings
 */
router.get('/settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // For now, return hardcoded settings. In production, store in database
    const settings = {
        matching: {
            maxDailyLikes: 50,
            maxDiscoverProfiles: 100,
            requireEmailVerification: true,
            requirePhotoVerification: false,
            minPhotos: 1,
            maxPhotos: 6,
        },
        moderation: {
            autoFlagKeywords: ['spam', 'scam', 'fake', 'inappropriate'],
            requirePhotoApproval: false,
            minReportsForAutoban: 5,
        },
        features: {
            chatEnabled: true,
            videoCallEnabled: false,
            voiceCallEnabled: false,
            gifEnabled: true,
            stickerEnabled: true,
        },
    };
    res.json({ success: true, settings });
}));
/**
 * PUT /api/admin/settings
 * Update system settings
 */
router.put('/settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        matching: zod_1.z.object({
            maxDailyLikes: zod_1.z.number().min(1).max(1000).optional(),
            maxDiscoverProfiles: zod_1.z.number().min(10).max(500).optional(),
            requireEmailVerification: zod_1.z.boolean().optional(),
            requirePhotoVerification: zod_1.z.boolean().optional(),
            minPhotos: zod_1.z.number().min(1).max(10).optional(),
            maxPhotos: zod_1.z.number().min(1).max(10).optional(),
        }).optional(),
        moderation: zod_1.z.object({
            autoFlagKeywords: zod_1.z.array(zod_1.z.string()).optional(),
            requirePhotoApproval: zod_1.z.boolean().optional(),
            minReportsForAutoban: zod_1.z.number().min(1).max(50).optional(),
        }).optional(),
        features: zod_1.z.object({
            chatEnabled: zod_1.z.boolean().optional(),
            videoCallEnabled: zod_1.z.boolean().optional(),
            voiceCallEnabled: zod_1.z.boolean().optional(),
            gifEnabled: zod_1.z.boolean().optional(),
            stickerEnabled: zod_1.z.boolean().optional(),
        }).optional(),
    });
    const settings = schema.parse(req.body);
    // Log the change
    await createAuditLog(req.user.id, 'UPDATE_SETTINGS', 'SETTINGS', 'system', settings, req);
    // In production, save to database
    // For now, just return success
    res.json({ success: true, settings });
}));
/**
 * DELETE /api/admin/likes/:id
 * Delete a like (admin action)
 */
router.delete('/likes/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const like = await index_1.prisma.like.findUnique({
        where: { id },
        include: {
            fromUser: { select: { email: true } },
            toUser: { select: { email: true } },
        },
    });
    if (!like) {
        throw new errorHandler_1.AppError('Like not found', 404);
    }
    await index_1.prisma.like.delete({
        where: { id },
    });
    // Log action
    await createAuditLog(req.user.id, 'DELETE_LIKE', 'LIKE', id, {
        fromUser: like.fromUser.email,
        toUser: like.toUser.email,
    }, req);
    res.json({
        success: true,
        message: 'Like deleted successfully',
    });
}));
/**
 * GET /api/admin/likes
 * Get all likes with pagination
 */
router.get('/likes', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search;
    const where = {};
    if (search) {
        where.OR = [
            { fromUser: { email: { contains: search, mode: 'insensitive' } } },
            { toUser: { email: { contains: search, mode: 'insensitive' } } },
        ];
    }
    const likes = await index_1.prisma.like.findMany({
        where,
        include: {
            fromUser: {
                select: { id: true, email: true, displayName: true },
            },
            toUser: {
                select: { id: true, email: true, displayName: true },
            },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
    });
    const total = await index_1.prisma.like.count({ where });
    res.json({
        success: true,
        likes,
        total,
        hasMore: offset + limit < total,
    });
}));
/**
 * DELETE /api/admin/matches/:id
 * Delete a match (unmatch users, admin action)
 */
router.delete('/matches/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const match = await index_1.prisma.match.findUnique({
        where: { id },
        include: {
            userA: { select: { email: true } },
            userB: { select: { email: true } },
        },
    });
    if (!match) {
        throw new errorHandler_1.AppError('Match not found', 404);
    }
    // Delete all messages in this match
    await index_1.prisma.message.deleteMany({
        where: { matchId: id },
    });
    // Delete the match
    await index_1.prisma.match.delete({
        where: { id },
    });
    // Log action
    await createAuditLog(req.user.id, 'DELETE_MATCH', 'MATCH', id, {
        userA: match.userA.email,
        userB: match.userB.email,
    }, req);
    res.json({
        success: true,
        message: 'Match deleted successfully',
    });
}));
/**
 * GET /api/admin/matches
 * Get all matches with pagination
 */
router.get('/matches', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search;
    const where = {};
    if (search) {
        where.OR = [
            { userA: { email: { contains: search, mode: 'insensitive' } } },
            { userB: { email: { contains: search, mode: 'insensitive' } } },
        ];
    }
    const matches = await index_1.prisma.match.findMany({
        where,
        include: {
            userA: {
                select: { id: true, email: true, displayName: true },
            },
            userB: {
                select: { id: true, email: true, displayName: true },
            },
            _count: {
                select: { messages: true },
            },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
    });
    const total = await index_1.prisma.match.count({ where });
    res.json({
        success: true,
        matches,
        total,
        hasMore: offset + limit < total,
    });
}));
exports.default = router;
//# sourceMappingURL=admin.js.map