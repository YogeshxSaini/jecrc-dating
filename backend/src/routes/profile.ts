import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadToS3, getSignedUploadUrl, deleteFromS3 } from '../utils/s3';
import { moderateImage } from '../services/moderation';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Validation schemas
const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string()).max(10).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']).optional(),
  lookingFor: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']).optional(),
  dateOfBirth: z.string().datetime().optional(),
  department: z.string().max(100).optional(),
  year: z.number().int().min(1).max(4).optional(),
});

/**
 * GET /api/profile/me
 * Get current user's profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            verifiedSelfie: true,
            createdAt: true,
          },
        },
        photos: {
          where: { moderationStatus: 'APPROVED' },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    res.json({
      success: true,
      profile,
    });
  })
);

/**
 * PUT /api/profile
 * Update user profile
 */
router.put(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = updateProfileSchema.parse(req.body);

    // Update user displayName if provided
    if (data.displayName) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { displayName: data.displayName },
      });
    }

    // Update profile
    const profile = await prisma.profile.update({
      where: { userId: req.user!.id },
      data: {
        bio: data.bio,
        interests: data.interests,
        gender: data.gender,
        lookingFor: data.lookingFor,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        department: data.department,
        year: data.year,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            verifiedSelfie: true,
          },
        },
        photos: {
          where: { moderationStatus: 'APPROVED' },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      profile,
    });
  })
);

/**
 * POST /api/profile/photos/upload-url
 * Get signed URL for photo upload
 */
router.post(
  '/photos/upload-url',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      throw new AppError('Filename and content type are required', 400);
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      throw new AppError('Invalid file type. Only JPEG, PNG, and WebP are allowed', 400);
    }

    // Check current photo count
    const photoCount = await prisma.photo.count({
      where: {
        profile: { userId: req.user!.id },
      },
    });

    if (photoCount >= 6) {
      throw new AppError('Maximum 6 photos allowed', 400);
    }

    // Generate unique filename
    const key = `photos/${req.user!.id}/${Date.now()}-${filename}`;
    
    // Get signed URL
    const { uploadUrl, fileUrl } = await getSignedUploadUrl(key, contentType);

    res.json({
      success: true,
      uploadUrl,
      fileUrl,
      key,
    });
  })
);

/**
 * POST /api/profile/photos
 * Confirm photo upload and create photo record
 */
router.post(
  '/photos',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { url, key } = req.body;

    if (!url || !key) {
      throw new AppError('URL and key are required', 400);
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    // TODO: Integrate with ML-based moderation service
    // For now, use the stub moderateImage function
    const moderation = await moderateImage(url);

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        url,
        moderationStatus: moderation.safe ? 'APPROVED' : 'REJECTED',
        moderationReason: moderation.reason,
        order: await prisma.photo.count({ where: { profileId: profile.id } }),
      },
    });

    res.json({
      success: true,
      photo,
    });
  })
);

/**
 * DELETE /api/profile/photos/:id
 * Delete a photo
 */
router.delete(
  '/photos/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Find photo and verify ownership
    const photo = await prisma.photo.findFirst({
      where: {
        id,
        profile: { userId: req.user!.id },
      },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    // Delete from S3 (don't block on this)
    deleteFromS3(photo.url).catch(console.error);

    // Delete from database
    await prisma.photo.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Photo deleted',
    });
  })
);

/**
 * POST /api/profile/photos/:id/set-primary
 * Set a photo as profile picture
 */
router.post(
  '/photos/:id/set-primary',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    // Verify photo ownership
    const photo = await prisma.photo.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    // Unset all other photos as profile pic
    await prisma.photo.updateMany({
      where: { profileId: profile.id },
      data: { isProfilePic: false },
    });

    // Set this photo as profile pic
    await prisma.photo.update({
      where: { id },
      data: { isProfilePic: true },
    });

    res.json({
      success: true,
      message: 'Profile picture updated',
    });
  })
);

/**
 * POST /api/profile/selfie-verification
 * Submit selfie for verification
 */
router.post(
  '/selfie-verification',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { selfieUrl } = req.body;

    if (!selfieUrl) {
      throw new AppError('Selfie URL is required', 400);
    }

    // Check if verification already exists
    const existing = await prisma.photoVerification.findUnique({
      where: { userId: req.user!.id },
    });

    if (existing && existing.status === 'PENDING') {
      throw new AppError('Verification already pending', 400);
    }

    // Create or update verification request
    const verification = await prisma.photoVerification.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        selfieUrl,
      },
      update: {
        selfieUrl,
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        reason: null,
      },
    });

    res.json({
      success: true,
      verification,
    });
  })
);

/**
 * GET /api/profile/:userId
 * Get another user's profile (for discovery/matching)
 */
router.get(
  '/:userId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    // Can't view own profile this way
    if (userId === req.user!.id) {
      throw new AppError('Use /api/profile/me to view your own profile', 400);
    }

    // Find user and profile
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true, isBanned: false },
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

    if (!user || !user.profile) {
      throw new AppError('Profile not found', 404);
    }

    res.json({
      success: true,
      profile: user.profile,
      user: {
        id: user.id,
        displayName: user.displayName,
        verifiedSelfie: user.verifiedSelfie,
      },
    });
  })
);

export default router;
