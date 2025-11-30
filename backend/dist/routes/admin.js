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
exports.default = router;
//# sourceMappingURL=admin.js.map