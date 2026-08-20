import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma
export const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request ID middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// API Routes
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import contactsRoutes from './routes/contacts.js';
import whatsappRoutes from './routes/whatsapp.js';
import campaignsRoutes from './routes/campaigns.js';
import postsRoutes from './routes/posts.js';
import postersRoutes from './routes/posters.js';
import chatbotRoutes from './routes/chatbot.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import reviewsRoutes from './routes/reviews.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import webhooksRoutes from './routes/webhooks.js';
import integrationsRoutes from './routes/integrations.js';
import leadsRoutes from './routes/leads.js';
import superAdminRoutes from './routes/super-admin.js';
import teamRoutes from './routes/team.js';
import automationRoutes from './routes/automation.js';
import intelligenceRoutes from './routes/intelligence.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import ecommerceRoutes from './routes/ecommerce.js';
import documentsRoutes from './routes/documents.js';
import qwenPreviewRoutes from './routes/qwen-preview.js';
import evolutionRoutes from './routes/evolution.js';
import notificationsRoutes from './routes/notifications.js';
import appointmentsRoutes from './routes/appointments.js';
import googleBusinessRoutes from './routes/google-business.js';

app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posters', postersRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/qwen', qwenPreviewRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/google-business', googleBusinessRoutes);

// Serve static frontend files in production
if (NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client');
  app.use(express.static(clientBuildPath));
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  await prisma.$disconnect();
  process.exit(1);
});

// Start server
app.listen(Number(PORT), HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT} in ${NODE_ENV} mode`);
});

// Export authenticate middleware for use in routes
export { authenticate } from './middleware/auth.js';

export default app;
