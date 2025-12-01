"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authenticate);
/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const notifications = await index_1.prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json({
        success: true,
        notifications,
    });
}));
/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await index_1.prisma.notification.updateMany({
        where: {
            id,
            userId: req.user.id,
        },
        data: { read: true },
    });
    res.json({ success: true });
}));
/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await index_1.prisma.notification.updateMany({
        where: { userId: req.user.id },
        data: { read: true },
    });
    res.json({ success: true });
}));
exports.default = router;
//# sourceMappingURL=notifications.js.map