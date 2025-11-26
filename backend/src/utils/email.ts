import nodemailer from 'nodemailer';
import config from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export type EmailProvider = 'console' | 'smtp';

/**
 * Console email adapter for local development
 * Logs emails to console instead of sending them
 */
class ConsoleEmailAdapter {
  async send(options: EmailOptions): Promise<void> {
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
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPass) {
      throw new Error('SMTP configuration is incomplete');
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: config.emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`📧 Email sent to ${options.to}`);
    } catch (error) {
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
  if (config.emailProvider === 'console') {
    return new ConsoleEmailAdapter();
  }
  
  if (config.emailProvider === 'smtp') {
    return new SMTPEmailAdapter();
  }

  throw new Error(`Unknown email provider: ${config.emailProvider}`);
}

// Get the configured email adapter
const emailAdapter = getEmailAdapter();

/**
 * Send an email using the configured email provider
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  await emailAdapter.send(options);
}

/**
 * Send OTP email template
 */
export async function sendOTPEmail(email: string, otp: string, isLogin: boolean = false): Promise<void> {
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
              <p>This code will expire in ${config.otpExpiryMinutes} minutes.</p>
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
export async function sendMatchNotificationEmail(email: string, matchName: string): Promise<void> {
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
            <a href="${config.frontendUrl}/matches" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
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
export async function sendPhotoVerificationEmail(
  email: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: status === 'approved' ? '✅ Photo Verification Approved' : '❌ Photo Verification Rejected',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>${status === 'approved' ? '✅ Verification Approved!' : '❌ Verification Rejected'}</h2>
            <p>${
              status === 'approved'
                ? 'Congratulations! Your photo verification has been approved. You now have a verified badge on your profile.'
                : 'Unfortunately, your photo verification was rejected.'
            }</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            ${status === 'rejected' ? '<p>You can submit a new verification photo from your profile settings.</p>' : ''}
          </div>
        </body>
      </html>
    `,
  });
}
