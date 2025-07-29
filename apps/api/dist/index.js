import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import databaseService from './features/database';
import userRoutes from './features/userRoutes';
import authRoutes from './features/authRoutes';
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
        const statusCode = healthStatus.connected ? 200 : 503;
        res.status(statusCode).json({
            ...healthStatus,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Database health check endpoint error:', error);
        res.status(503).json({
            status: 'unhealthy',
            connected: false,
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
// Error handling middleware
app.use((err, req, res) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
export default app;
