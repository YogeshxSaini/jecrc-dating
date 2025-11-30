"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = uploadToS3;
exports.getSignedUploadUrl = getSignedUploadUrl;
exports.getSignedDownloadUrl = getSignedDownloadUrl;
exports.deleteFromS3 = deleteFromS3;
exports.extractS3Key = extractS3Key;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = __importDefault(require("../config"));
// Initialize S3 client
const s3Client = new client_s3_1.S3Client({
    endpoint: config_1.default.s3Endpoint,
    region: config_1.default.s3Region,
    credentials: {
        accessKeyId: config_1.default.s3AccessKey,
        secretAccessKey: config_1.default.s3SecretKey,
    },
    forcePathStyle: config_1.default.s3UsePathStyle, // Required for MinIO
});
/**
 * Upload file to S3
 */
async function uploadToS3(key, file, contentType) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: config_1.default.s3Bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
    });
    await s3Client.send(command);
    // Return the public URL
    if (config_1.default.s3Endpoint) {
        return `${config_1.default.s3Endpoint}/${config_1.default.s3Bucket}/${key}`;
    }
    return `https://${config_1.default.s3Bucket}.s3.${config_1.default.s3Region}.amazonaws.com/${key}`;
}
/**
 * Get signed URL for uploading to S3
 * Allows client to upload directly to S3
 */
async function getSignedUploadUrl(key, contentType, expiresIn = 300 // 5 minutes
) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: config_1.default.s3Bucket,
        Key: key,
        ContentType: contentType,
    });
    const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
    // Construct the file URL
    let fileUrl;
    if (config_1.default.s3Endpoint) {
        fileUrl = `${config_1.default.s3Endpoint}/${config_1.default.s3Bucket}/${key}`;
    }
    else {
        fileUrl = `https://${config_1.default.s3Bucket}.s3.${config_1.default.s3Region}.amazonaws.com/${key}`;
    }
    return { uploadUrl, fileUrl };
}
/**
 * Get signed URL for downloading from S3
 */
async function getSignedDownloadUrl(key, expiresIn = 3600 // 1 hour
) {
    const command = new client_s3_1.GetObjectCommand({
        Bucket: config_1.default.s3Bucket,
        Key: key,
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
}
/**
 * Delete file from S3
 */
async function deleteFromS3(urlOrKey) {
    try {
        // Extract key from URL if full URL is provided
        let key = urlOrKey;
        if (urlOrKey.includes(config_1.default.s3Bucket)) {
            const parts = urlOrKey.split(`${config_1.default.s3Bucket}/`);
            key = parts[1];
        }
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: config_1.default.s3Bucket,
            Key: key,
        });
        await s3Client.send(command);
        console.log(`Deleted file from S3: ${key}`);
    }
    catch (error) {
        console.error('Error deleting from S3:', error);
        throw error;
    }
}
/**
 * Extract S3 key from URL
 */
function extractS3Key(url) {
    if (url.includes(config_1.default.s3Bucket)) {
        const parts = url.split(`${config_1.default.s3Bucket}/`);
        return parts[1];
    }
    return url;
}
//# sourceMappingURL=s3.js.map