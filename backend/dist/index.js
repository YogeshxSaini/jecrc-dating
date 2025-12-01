"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const profile_1 = __importDefault(require("./routes/profile"));
const discover_1 = __importDefault(require("./routes/discover"));
const likes_1 = __importDefault(require("./routes/likes"));
const matches_1 = __importDefault(require("./routes/matches"));
const admin_1 = __importDefault(require("./routes/admin"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const photos_1 = __importDefault(require("./routes/photos"));
const messages_1 = __importDefault(require("./routes/messages"));
const chat_1 = __importDefault(require("./routes/chat"));
const messagingServer_1 = require("./messaging/messagingServer");
// Load environment variables
dotenv_1.default.config();
// Initialize Prisma Client
exports.prisma = new client_1.PrismaClient();
// Initialize Express app
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Trust proxy for ngrok/reverse proxies
app.set('trust proxy', 1);
// CORS configuration - allow multiple origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.29.234:3000',
    'https://a28b01305f38.ngrok-free.app',
    'https://e79b7776f70a.ngrok-free.app',
    'https://dayalcolonizers.xyz',
    process.env.FRONTEND_URL,
].filter((origin) => Boolean(origin));
// Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        // Check if origin is allowed or matches cloudflare patterns
        if (allowedOrigins.includes(origin) ||
            origin.endsWith('.trycloudflare.com') ||
            origin.endsWith('.pages.dev')) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use((0, compression_1.default)()); // Compress responses
app.use((0, morgan_1.default)('dev')); // Logging
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Apply rate limiting globally
app.use(rateLimiter_1.rateLimiter);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '💖 JECRC Dating API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            profile: '/api/profile',
            discover: '/api/discover',
            likes: '/api/likes',
            matches: '/api/matches',
            admin: '/api/admin',
            notifications: '/api/notifications',
            photos: '/api/photos',
            health: '/health',
        },
    });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});
// Debug endpoint to test database connection
app.get('/debug/db', async (req, res) => {
    try {
        await exports.prisma.$connect();
        const userCount = await exports.prisma.user.count();
        res.json({
            success: true,
            database: 'connected',
            userCount,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            database: 'failed',
            error: error.message,
            stack: error.stack,
        });
    }
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/discover', discover_1.default);
app.use('/api/likes', likes_1.default);
app.use('/api/matches', matches_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/photos', photos_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/chat', chat_1.default);
// Initialize messaging server (Socket.IO)
(0, messagingServer_1.initializeMessagingServer)(server);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Allowed email domain: @${process.env.ALLOWED_EMAIL_DOMAIN || 'jecrc.ac.in'}`);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await exports.prisma.$disconnect();
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await exports.prisma.$disconnect();
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map