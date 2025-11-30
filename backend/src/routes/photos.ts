import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * POST /api/photos/upload
 * Upload a photo (expects base64 image data)
 */
router.post(
  '/upload',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const schema = z.object({
      imageData: z.string(), // base64 encoded image
      isProfilePic: z.boolean().optional().default(false),
    });

    const { imageData, isProfilePic } = schema.parse(req.body);

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
      include: { photos: true },
    });

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    // Check photo limit (max 6 photos)
    if (profile.photos.length >= 6) {
      throw new AppError('Maximum 6 photos allowed', 400);
    }

    // If setting as profile pic, unset other profile pics
    if (isProfilePic) {
      await prisma.photo.updateMany({
        where: {
          profileId: profile.id,
          isProfilePic: true,
        },
        data: { isProfilePic: false },
      });
    }

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        url: imageData, // In production, upload to S3/Cloudinary
        thumbnailUrl: imageData, // Generate thumbnail in production
        order: profile.photos.length,
        isProfilePic: isProfilePic || profile.photos.length === 0, // First photo is profile pic
        moderationStatus: 'APPROVED', // Auto-approve for now, add moderation later
      },
    });

    res.json({
      success: true,
      photo,
    });
  })
);

/**
 * GET /api/photos
 * Get current user's photos
 */
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    res.json({
      success: true,
      photos: profile.photos,
    });
  })
);

/**
 * PUT /api/photos/:id
 * Update photo (set as profile pic, reorder)
 */
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const schema = z.object({
      isProfilePic: z.boolean().optional(),
      order: z.number().optional(),
    });

    const data = schema.parse(req.body);

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    if (photo.profile.userId !== req.user!.id) {
      throw new AppError('Unauthorized', 403);
    }

    // If setting as profile pic, unset others
    if (data.isProfilePic) {
      await prisma.photo.updateMany({
        where: {
          profileId: photo.profileId,
          isProfilePic: true,
        },
        data: { isProfilePic: false },
      });
    }

    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      photo: updatedPhoto,
    });
  })
);

/**
 * DELETE /api/photos/:id
 * Delete a photo
 */
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    if (photo.profile.userId !== req.user!.id) {
      throw new AppError('Unauthorized', 403);
    }

    await prisma.photo.delete({
      where: { id },
    });

    // If this was the profile pic, set the first remaining photo as profile pic
    if (photo.isProfilePic) {
      const firstPhoto = await prisma.photo.findFirst({
        where: { profileId: photo.profileId },
        orderBy: { order: 'asc' },
      });

      if (firstPhoto) {
        await prisma.photo.update({
          where: { id: firstPhoto.id },
          data: { isProfilePic: true },
        });
      }
    }

    res.json({
      success: true,
      message: 'Photo deleted',
    });
  })
);

export default router;
