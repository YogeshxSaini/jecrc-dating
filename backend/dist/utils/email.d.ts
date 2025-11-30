export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}
export type EmailProvider = 'console' | 'smtp';
/**
 * Send an email using the configured email provider
 */
export declare function sendEmail(options: EmailOptions): Promise<void>;
/**
 * Send OTP email template
 */
export declare function sendOTPEmail(email: string, otp: string, isLogin?: boolean): Promise<void>;
/**
 * Send match notification email
 */
export declare function sendMatchNotificationEmail(email: string, matchName: string): Promise<void>;
/**
 * Send photo verification status email
 */
export declare function sendPhotoVerificationEmail(email: string, status: 'approved' | 'rejected', reason?: string): Promise<void>;
//# sourceMappingURL=email.d.ts.map