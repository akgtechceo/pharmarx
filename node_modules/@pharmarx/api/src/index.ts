import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import databaseService from './features/database';
import userRoutes from './features/userRoutes';
import authRoutes from './features/authRoutes';
import { ocrRoutes } from './features/ocrRoutes';
import { prescriptionOrderRoutes } from './features/prescriptionOrderRoutes';
import paymentRoutes from './features/paymentRoutes';
import webhookRoutes from './features/webhookRoutes';
import deliveryTrackingRoutes from './features/deliveryTrackingRoutes';
import profileRoutes from './features/profileRoutes';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV 
  });
});

// Database health check endpoint
app.get('/health/database', async (req, res) => {
  try {
    const healthStatus = await databaseService.healthCheck();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ...healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check endpoint error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'PharmaRx API is running' });
});

// User routes
app.use('/api/users', userRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Profile routes
app.use('/api/profiles', profileRoutes);

// OCR routes
app.use('/api', ocrRoutes);

// Prescription order routes
app.use('/api', prescriptionOrderRoutes);

// Payment routes
app.use('/api', paymentRoutes);

// Delivery tracking routes
app.use('/api/orders', deliveryTrackingRoutes);

// Webhook routes (no /api prefix for webhooks as they come from external services)
app.use('/', webhookRoutes);

// 404 handler for unmatched routes (must come before error handler)
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method 
  });
});

// Error handling middleware (must have 4 parameters to be recognized as error handler)
// eslint-disable-next-line @typescript-eslint/no-unused-vars  
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err.stack);
  
  // Don't expose detailed error messages in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({ 
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app; 