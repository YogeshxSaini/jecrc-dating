/**
 * Upload file to S3
 */
export declare function uploadToS3(key: string, file: Buffer, contentType: string): Promise<string>;
/**
 * Get signed URL for uploading to S3
 * Allows client to upload directly to S3
 */
export declare function getSignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<{
    uploadUrl: string;
    fileUrl: string;
}>;
/**
 * Get signed URL for downloading from S3
 */
export declare function getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
/**
 * Delete file from S3
 */
export declare function deleteFromS3(urlOrKey: string): Promise<void>;
/**
 * Extract S3 key from URL
 */
export declare function extractS3Key(url: string): string;
//# sourceMappingURL=s3.d.ts.map