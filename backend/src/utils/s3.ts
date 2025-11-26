import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: config.s3Endpoint,
  region: config.s3Region,
  credentials: {
    accessKeyId: config.s3AccessKey,
    secretAccessKey: config.s3SecretKey,
  },
  forcePathStyle: config.s3UsePathStyle, // Required for MinIO
});

/**
 * Upload file to S3
 */
export async function uploadToS3(
  key: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public URL
  if (config.s3Endpoint) {
    return `${config.s3Endpoint}/${config.s3Bucket}/${key}`;
  }
  return `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`;
}

/**
 * Get signed URL for uploading to S3
 * Allows client to upload directly to S3
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300 // 5 minutes
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  // Construct the file URL
  let fileUrl: string;
  if (config.s3Endpoint) {
    fileUrl = `${config.s3Endpoint}/${config.s3Bucket}/${key}`;
  } else {
    fileUrl = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`;
  }

  return { uploadUrl, fileUrl };
}

/**
 * Get signed URL for downloading from S3
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(urlOrKey: string): Promise<void> {
  try {
    // Extract key from URL if full URL is provided
    let key = urlOrKey;
    if (urlOrKey.includes(config.s3Bucket)) {
      const parts = urlOrKey.split(`${config.s3Bucket}/`);
      key = parts[1];
    }

    const command = new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Deleted file from S3: ${key}`);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
}

/**
 * Extract S3 key from URL
 */
export function extractS3Key(url: string): string {
  if (url.includes(config.s3Bucket)) {
    const parts = url.split(`${config.s3Bucket}/`);
    return parts[1];
  }
  return url;
}
