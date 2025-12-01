import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import discoverRoutes from './routes/discover';
import likesRoutes from './routes/likes';
import matchesRoutes from './routes/matches';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import photosRoutes from './routes/photos';
import messagesRoutes from './routes/messages';
import { initializeMessagingServer } from './messaging/messagingServer';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Initialize Express app
const app: Application = express();
const server = http.createServer(app);

// Trust proxy for ngrok/reverse proxies
app.set('trust proxy', 1);

// CORS configuration - allow multiple origins
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://192.168.29.234:3000',
  'https://a28b01305f38.ngrok-free.app',
  'https://e79b7776f70a.ngrok-free.app',
  'https://dayalcolonizers.xyz',
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed or matches cloudflare patterns
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.trycloudflare.com') || 
        origin.endsWith('.pages.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting globally
app.use(rateLimiter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
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
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Debug endpoint to test database connection
app.get('/debug/db', async (req: Request, res: Response) => {
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    res.json({
      success: true,
      database: 'connected',
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      database: 'failed',
      error: error.message,
      stack: error.stack,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/messages', messagesRoutes);

// Initialize messaging server (Socket.IO)
initializeMessagingServer(server);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

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
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect();
    process.exit(0);
  });
});
