/**
 * Image moderation service stub
 * TODO: Integrate with real ML-based moderation service
 * - AWS Rekognition
 * - Google Cloud Vision API
 * - Microsoft Azure Content Moderator
 * - Custom ML model
 */
export interface ModerationResult {
    safe: boolean;
    reason?: string;
    labels?: string[];
    confidence?: number;
}
/**
 * Moderate image for inappropriate content
 * This is a stub implementation that always approves images
 *
 * In production, this should call an actual moderation service:
 *
 * Example with AWS Rekognition:
 * ```typescript
 * import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
 *
 * const rekognition = new RekognitionClient({ region: 'us-east-1' });
 *
 * const command = new DetectModerationLabelsCommand({
 *   Image: { S3Object: { Bucket: bucket, Name: key } },
 *   MinConfidence: 60,
 * });
 *
 * const response = await rekognition.send(command);
 * const labels = response.ModerationLabels || [];
 *
 * // Check for inappropriate content
 * const inappropriate = labels.some(label =>
 *   ['Explicit Nudity', 'Violence', 'Visually Disturbing'].includes(label.ParentName!)
 * );
 * ```
 */
export declare function moderateImage(url: string): Promise<ModerationResult>;
/**
 * Moderate text content for inappropriate language
 * TODO: Integrate with text moderation service
 */
export declare function moderateText(text: string): Promise<ModerationResult>;
/**
 * Batch moderate multiple images
 */
export declare function moderateImages(urls: string[]): Promise<ModerationResult[]>;
//# sourceMappingURL=moderation.d.ts.map