import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import scheduleRoutes from './routes/scheduleRoutes';
import { globalErrorHandler } from './middlewares/validation';
import UserRoutes from './routes/userRoute';
import authRoutes from './routes/authRoutes';
import attendanceRoutes from './routes/attendance';
import { testRailwayTimezone } from './controllers/attendanceController';


const app = express();
const PORT = process.env.PORT || 5000;

// ==================== SECURITY & MIDDLEWARE ====================
// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourapp.com'] // Replace with your production domains
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for correct IP addresses
app.set('trust proxy', 1);

// ==================== DATABASE CONNECTION ====================
const connectDB = async () => {
  try {
    // Periksa apakah MONGO_URI ada (sesuai dengan nama di .env)
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined. Please check your .env file.');
    }

    console.log('🔄 Connecting to MongoDB Atlas...');

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// ==================== ROUTES ====================
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb_connected: mongoose.connection.readyState === 1
  });
});

// API routes
app.use('/api/schedule', scheduleRoutes);
app.use('/api/users', UserRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/test-timezone', testRailwayTimezone)


// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Jadwal Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: 'GET /health',
      schedules: {
        upload: 'POST /api/schedule/upload-excel',
        all: 'GET /api/schedule/all',
        search: 'GET /api/schedule/search?name=:name',
        employee: 'GET /api/schedule/:employeeId',
        filter_month: 'GET /api/schedule/:employeeId/filter?month=:month&year=:year',
        current_month: 'GET /api/schedule/:employeeId/current-month',
        available_months: 'GET /api/schedule/:employeeId/available-months',
        date_range: 'GET /api/schedule/:employeeId/date-range?start_date=:start&end_date=:end'
      }
    }
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    available_routes: [
      'GET /',
      'GET /health',
      'POST /api/schedule/upload-excel',
      'GET /api/schedule/all',
      'GET /api/schedule/search',
      'GET /api/schedule/:employeeId',
      'GET /api/schedule/:employeeId/filter',
      'GET /api/schedule/:employeeId/current-month',
      'GET /api/schedule/:employeeId/available-months',
      'GET /api/schedule/:employeeId/date-range'
    ]
  });
});

// ==================== ERROR HANDLING ====================
// Global error handler (must be last)
app.use(globalErrorHandler);

// ==================== SERVER STARTUP ====================
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server
    app.listen(PORT, () => {
      console.log('🚀 Server started successfully');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Local URL: http://localhost:${PORT}`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log('==========================================');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;