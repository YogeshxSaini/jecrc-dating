import { Router, Response } from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      notifications,
    });
  })
);

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put(
  '/:id/read',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    await prisma.notification.updateMany({
      where: {
        id,
        userId: req.user!.id,
      },
      data: { read: true },
    });

    res.json({ success: true });
  })
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put(
  '/read-all',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id },
      data: { read: true },
    });

    res.json({ success: true });
  })
);

export default router;
