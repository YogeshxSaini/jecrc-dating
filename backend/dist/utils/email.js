"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendOTPEmail = sendOTPEmail;
exports.sendMatchNotificationEmail = sendMatchNotificationEmail;
exports.sendPhotoVerificationEmail = sendPhotoVerificationEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
/**
 * Console email adapter for local development
 * Logs emails to console instead of sending them
 */
class ConsoleEmailAdapter {
    async send(options) {
        console.log('\n📧 Email sent (Console Mode)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('Content:');
        console.log(options.html.replace(/<[^>]*>/g, '')); // Strip HTML tags for console
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
}
/**
 * SMTP email adapter for production
 * Sends emails via SMTP provider (SendGrid, AWS SES, etc.)
 */
class SMTPEmailAdapter {
    constructor() {
        if (!config_1.default.smtpHost || !config_1.default.smtpPort || !config_1.default.smtpUser || !config_1.default.smtpPass) {
            throw new Error('SMTP configuration is incomplete');
        }
        this.transporter = nodemailer_1.default.createTransport({
            host: config_1.default.smtpHost,
            port: config_1.default.smtpPort,
            secure: config_1.default.smtpPort === 465, // true for 465, false for other ports
            auth: {
                user: config_1.default.smtpUser,
                pass: config_1.default.smtpPass,
            },
        });
    }
    async send(options) {
        try {
            await this.transporter.sendMail({
                from: config_1.default.emailFrom,
                to: options.to,
                subject: options.subject,
                html: options.html,
            });
            console.log(`📧 Email sent to ${options.to}`);
        }
        catch (error) {
            console.error('Email send error:', error);
            throw new Error('Failed to send email');
        }
    }
}
// TODO: Add more email providers as needed
// - AWS SES adapter
// - SendGrid adapter
// - Mailgun adapter
// Each adapter should implement the same interface for easy swapping
/**
 * Factory function to get the appropriate email adapter
 */
function getEmailAdapter() {
    if (config_1.default.emailProvider === 'console') {
        return new ConsoleEmailAdapter();
    }
    if (config_1.default.emailProvider === 'smtp') {
        return new SMTPEmailAdapter();
    }
    throw new Error(`Unknown email provider: ${config_1.default.emailProvider}`);
}
// Get the configured email adapter
const emailAdapter = getEmailAdapter();
/**
 * Send an email using the configured email provider
 */
async function sendEmail(options) {
    await emailAdapter.send(options);
}
/**
 * Send OTP email template
 */
async function sendOTPEmail(email, otp, isLogin = false) {
    await sendEmail({
        to: email,
        subject: isLogin ? 'Your Login Code' : 'Verify Your Email',
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; letter-spacing: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❤️ JECRC Dating</h1>
            </div>
            <div class="content">
              <h2>${isLogin ? 'Welcome back!' : 'Welcome to JECRC Dating!'}</h2>
              <p>Your verification code is:</p>
              <div class="otp">${otp}</div>
              <p>This code will expire in ${config_1.default.otpExpiryMinutes} minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JECRC Dating. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    });
}
/**
 * Send match notification email
 */
async function sendMatchNotificationEmail(email, matchName) {
    await sendEmail({
        to: email,
        subject: '💕 You have a new match!',
        html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🎉 It's a Match!</h2>
            <p>You and <strong>${matchName}</strong> liked each other!</p>
            <p>Start chatting now and get to know each other.</p>
            <a href="${config_1.default.frontendUrl}/matches" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
              View Match
            </a>
          </div>
        </body>
      </html>
    `,
    });
}
/**
 * Send photo verification status email
 */
async function sendPhotoVerificationEmail(email, status, reason) {
    await sendEmail({
        to: email,
        subject: status === 'approved' ? '✅ Photo Verification Approved' : '❌ Photo Verification Rejected',
        html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>${status === 'approved' ? '✅ Verification Approved!' : '❌ Verification Rejected'}</h2>
            <p>${status === 'approved'
            ? 'Congratulations! Your photo verification has been approved. You now have a verified badge on your profile.'
            : 'Unfortunately, your photo verification was rejected.'}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            ${status === 'rejected' ? '<p>You can submit a new verification photo from your profile settings.</p>' : ''}
          </div>
        </body>
      </html>
    `,
    });
}
//# sourceMappingURL=email.js.map