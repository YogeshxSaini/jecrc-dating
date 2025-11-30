"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const s3_1 = require("../utils/s3");
const moderation_1 = require("../services/moderation");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
// Validation schemas
const updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(2).max(50).optional(),
    bio: zod_1.z.string().max(500).optional(),
    interests: zod_1.z.array(zod_1.z.string()).max(10).optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']).optional(),
    lookingFor: zod_1.z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']).optional(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    department: zod_1.z.string().max(100).optional(),
    year: zod_1.z.number().int().min(1).max(4).optional(),
});
/**
 * GET /api/profile/me
 * Get current user's profile
 */
router.get('/me', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const profile = await index_1.prisma.profile.findUnique({
        where: { userId: req.user.id },
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
        throw new errorHandler_1.AppError('Profile not found', 404);
    }
    res.json({
        success: true,
        profile,
    });
}));
/**
 * PUT /api/profile
 * Update user profile
 */
router.put('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    // Update user displayName if provided
    if (data.displayName) {
        await index_1.prisma.user.update({
            where: { id: req.user.id },
            data: { displayName: data.displayName },
        });
    }
    // Update profile
    const profile = await index_1.prisma.profile.update({
        where: { userId: req.user.id },
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
}));
/**
 * POST /api/profile/photos/upload-url
 * Get signed URL for photo upload
 */
router.post('/photos/upload-url', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
        throw new errorHandler_1.AppError('Filename and content type are required', 400);
    }
    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
        throw new errorHandler_1.AppError('Invalid file type. Only JPEG, PNG, and WebP are allowed', 400);
    }
    // Check current photo count
    const photoCount = await index_1.prisma.photo.count({
        where: {
            profile: { userId: req.user.id },
        },
    });
    if (photoCount >= 6) {
        throw new errorHandler_1.AppError('Maximum 6 photos allowed', 400);
    }
    // Generate unique filename
    const key = `photos/${req.user.id}/${Date.now()}-${filename}`;
    // Get signed URL
    const { uploadUrl, fileUrl } = await (0, s3_1.getSignedUploadUrl)(key, contentType);
    res.json({
        success: true,
        uploadUrl,
        fileUrl,
        key,
    });
}));
/**
 * POST /api/profile/photos
 * Confirm photo upload and create photo record
 */
router.post('/photos', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { url, key } = req.body;
    if (!url || !key) {
        throw new errorHandler_1.AppError('URL and key are required', 400);
    }
    // Get profile
    const profile = await index_1.prisma.profile.findUnique({
        where: { userId: req.user.id },
    });
    if (!profile) {
        throw new errorHandler_1.AppError('Profile not found', 404);
    }
    // TODO: Integrate with ML-based moderation service
    // For now, use the stub moderateImage function
    const moderation = await (0, moderation_1.moderateImage)(url);
    // Create photo record
    const photo = await index_1.prisma.photo.create({
        data: {
            profileId: profile.id,
            url,
            moderationStatus: moderation.safe ? 'APPROVED' : 'REJECTED',
            moderationReason: moderation.reason,
            order: await index_1.prisma.photo.count({ where: { profileId: profile.id } }),
        },
    });
    res.json({
        success: true,
        photo,
    });
}));
/**
 * DELETE /api/profile/photos/:id
 * Delete a photo
 */
router.delete('/photos/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Find photo and verify ownership
    const photo = await index_1.prisma.photo.findFirst({
        where: {
            id,
            profile: { userId: req.user.id },
        },
    });
    if (!photo) {
        throw new errorHandler_1.AppError('Photo not found', 404);
    }
    // Delete from S3 (don't block on this)
    (0, s3_1.deleteFromS3)(photo.url).catch(console.error);
    // Delete from database
    await index_1.prisma.photo.delete({
        where: { id },
    });
    res.json({
        success: true,
        message: 'Photo deleted',
    });
}));
/**
 * POST /api/profile/photos/:id/set-primary
 * Set a photo as profile picture
 */
router.post('/photos/:id/set-primary', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const profile = await index_1.prisma.profile.findUnique({
        where: { userId: req.user.id },
    });
    if (!profile) {
        throw new errorHandler_1.AppError('Profile not found', 404);
    }
    // Verify photo ownership
    const photo = await index_1.prisma.photo.findFirst({
        where: {
            id,
            profileId: profile.id,
        },
    });
    if (!photo) {
        throw new errorHandler_1.AppError('Photo not found', 404);
    }
    // Unset all other photos as profile pic
    await index_1.prisma.photo.updateMany({
        where: { profileId: profile.id },
        data: { isProfilePic: false },
    });
    // Set this photo as profile pic
    await index_1.prisma.photo.update({
        where: { id },
        data: { isProfilePic: true },
    });
    res.json({
        success: true,
        message: 'Profile picture updated',
    });
}));
/**
 * POST /api/profile/selfie-verification
 * Submit selfie for verification
 */
router.post('/selfie-verification', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { selfieUrl } = req.body;
    if (!selfieUrl) {
        throw new errorHandler_1.AppError('Selfie URL is required', 400);
    }
    // Check if verification already exists
    const existing = await index_1.prisma.photoVerification.findUnique({
        where: { userId: req.user.id },
    });
    if (existing && existing.status === 'PENDING') {
        throw new errorHandler_1.AppError('Verification already pending', 400);
    }
    // Create or update verification request
    const verification = await index_1.prisma.photoVerification.upsert({
        where: { userId: req.user.id },
        create: {
            userId: req.user.id,
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
}));
/**
 * GET /api/profile/:userId
 * Get another user's profile (for discovery/matching)
 */
router.get('/:userId', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    // Can't view own profile this way
    if (userId === req.user.id) {
        throw new errorHandler_1.AppError('Use /api/profile/me to view your own profile', 400);
    }
    // Find user and profile
    const user = await index_1.prisma.user.findUnique({
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
        throw new errorHandler_1.AppError('Profile not found', 404);
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
}));
exports.default = router;
//# sourceMappingURL=profile.js.map