interface Config {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    databaseUrl: string;
    redisUrl: string;
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    emailProvider: 'console' | 'smtp';
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    emailFrom: string;
    allowedEmailDomain: string;
    s3Endpoint?: string;
    s3Bucket: string;
    s3AccessKey: string;
    s3SecretKey: string;
    s3Region: string;
    s3UsePathStyle: boolean;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    otpExpiryMinutes: number;
    otpMaxAttempts: number;
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map