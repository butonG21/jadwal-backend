import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Routes
import scheduleRoutes from './routes/scheduleRoutes';
import userRoutes from './routes/userRoute';
import authRoutes from './routes/authRoutes';
import attendanceRoutes from './routes/attendance';
import cronRoutes from './routes/cronRoutes';

// Services
import { cronService } from './services/cronService';

// Middleware
import { globalErrorHandler, notFoundHandler } from './middlewares/errorHandler';
import { validateEnvironment } from './config/environment';
import { connectDatabase } from './config/database';
import { logger } from './utils/loggers';
import { ApiResponse } from './utils/apiResponse';

class Application {
  public app: express.Application;
  private readonly PORT: number;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || '5000', 10);
    
    this.validateEnvironment();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private validateEnvironment(): void {
    validateEnvironment();
  }

  private initializeMiddleware(): void {
    // Trust proxy for correct IP addresses
    this.app.set('trust proxy', true);


    this.app.use((req, res, next) => {
      console.log('Client IP:', req.ip);
      console.log('Forwarded IPs:', req.headers['x-forwarded-for']);
      next();
    });
    
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Compression middleware
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // CORS configuration
    this.app.use(cors({
      origin: this.getCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count']
    }));

    // Logging middleware
    if (process.env.NODE_ENV !== 'production') {
      this.app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) }
      }));
    }

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '50mb',
      verify: (req, res, buf) => {
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));


    // Custom middleware for request context
    this.app.use((req, res, next) => {
      (req as any).requestId = this.generateRequestId();
      (req as any).startTime = Date.now();
      res.locals.requestId = (req as any).requestId;
      next();
    });
  }

  private getCorsOrigins(): string[] {
    if (process.env.NODE_ENV === 'production') {
      return process.env.CORS_ORIGINS?.split(',') || ['https://yourapp.com'];
    }
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/health/detailed', this.detailedHealthCheck.bind(this));

    // API routes with versioning
    const apiV1 = '/api/v1';
    this.app.use(`${apiV1}/schedule`, scheduleRoutes);
    this.app.use(`${apiV1}/users`, userRoutes);
    this.app.use(`${apiV1}/auth`, authRoutes);
    this.app.use(`${apiV1}/attendance`, attendanceRoutes);
    this.app.use(`${apiV1}/cron`, cronRoutes);

    // Backward compatibility - keep old routes
    this.app.use('/api/schedule', scheduleRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/attendance', attendanceRoutes);

    // Root endpoint with API documentation
    this.app.get('/', this.rootEndpoint.bind(this));

    // API documentation endpoint
    this.app.get('/api/docs', this.apiDocumentation.bind(this));
  }

  private async healthCheck(req: express.Request, res: express.Response): Promise<void> {
    const healthData = {
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      mongodb_connected: mongoose.connection.readyState === 1,
      memory_usage: process.memoryUsage(),
      requestId: (req as any).requestId
    };

    res.status(200).json(ApiResponse.success('Health check passed', healthData));
  }

  private async detailedHealthCheck(req: express.Request, res: express.Response): Promise<void> {
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState
    };

    const memoryUsage = process.memoryUsage();
    const systemHealth = {
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        arrayBuffers: `${Math.round((memoryUsage as any).arrayBuffers / 1024 / 1024)} MB`
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };

    const healthData = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: dbStatus,
      system: systemHealth,
      services: {
        imagekit: {
          configured: !!(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY)
        },
        external_api: {
          attendance_api: !!process.env.ATTENDANCE_API_URL
        }
      }
    };

    const status = dbStatus.connected ? 200 : 503;
    res.status(status).json(ApiResponse.success('Detailed health check', healthData));
  }

  private rootEndpoint(req: express.Request, res: express.Response): void {
    const apiInfo = {
      success: true,
      message: 'Jadwal Backend API - Enhanced Version',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      documentation: '/api/docs',
      health_check: '/health',
      detailed_health: '/health/detailed',
      api_versions: {
        v1: '/api/v1',
        current: '/api' // backward compatibility
      },
      endpoints: {
        auth: {
          login: 'POST /api/v1/auth/login',
          logout: 'POST /api/v1/auth/logout',
          verify: 'GET /api/v1/auth/verify',
          status: 'GET /api/v1/auth/status'
        },
        users: {
          profile: 'GET /api/v1/users/me',
          update_profile: 'PUT /api/v1/users/me',
          stats: 'GET /api/v1/users/me/stats'
        },
        profile_images: {
          upload: 'POST /api/v1/users/profile/image/upload',
          get: 'GET /api/v1/users/profile/image',
          delete: 'DELETE /api/v1/users/profile/image',
          update_meta: 'PUT /api/v1/users/profile/image/meta',
          get_by_user: 'GET /api/v1/users/profile/image/user/:userId'
        },
        schedules: {
          upload: 'POST /api/v1/schedule/upload-excel',
          all: 'GET /api/v1/schedule/all',
          search: 'GET /api/v1/schedule/search?name=:name',
          employee: 'GET /api/v1/schedule/:employeeId',
          filter_month: 'GET /api/v1/schedule/:employeeId/filter?month=:month&year=:year',
          current_month: 'GET /api/v1/schedule/:employeeId/current-month',
          available_months: 'GET /api/v1/schedule/:employeeId/available-months',
          date_range: 'GET /api/v1/schedule/:employeeId/date-range?start_date=:start&end_date=:end'
        },
        attendance: {
          fetch_all: 'POST /api/v1/attendance/fetch-all',
          fetch_user: 'GET /api/v1/attendance/fetch/:employeeId',
          filter: 'GET /api/v1/attendance/:employeeId/filter',
          migrate_images: 'POST /api/v1/attendance/migrate-images',
          migration_stats: 'GET /api/v1/attendance/migration-stats'
        }
      }
    };

    res.status(200).json(apiInfo);
  }
  
  private apiDocumentation(req: express.Request, res: express.Response): void {
    // This would ideally serve Swagger/OpenAPI documentation
    res.status(200).json({
      success: true,
      message: 'API Documentation',
      swagger_url: '/api/docs/swagger',
      postman_collection: '/api/docs/postman',
      readme: 'https://github.com/yourrepo/api-docs'
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', notFoundHandler);

    // Global error handler (must be last)
    this.app.use(globalErrorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database first
      await connectDatabase();
      
      // Initialize cron service
      cronService.initialize();
      logger.info('⏰ Cron service initialized');
      
      // Start server
      const server = this.app.listen(this.PORT, () => {
        logger.info('🚀 Server started successfully');
        logger.info(`📡 Server running on port ${this.PORT}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📍 Local URL: http://localhost:${this.PORT}`);
        logger.info(`💚 Health check: http://localhost:${this.PORT}/health`);
        logger.info('==========================================');
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown(server);
      
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(server: any): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 ${signal} received. Shutting down gracefully...`);
      
      try {
        // Stop accepting new connections
        server.close(async () => {
          logger.info('🔌 HTTP server closed');
          
          // Shutdown cron service
          cronService.shutdown();
          logger.info('⏰ Cron service shutdown');
          
          // Close database connection
          await mongoose.connection.close();
          logger.info('✅ MongoDB connection closed');
          
          // Exit process
          process.exit(0);
        });

        // Force close after timeout
        setTimeout(() => {
          logger.error('❌ Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 30000);

      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Start the application
if (require.main === module) {
  const app = new Application();
  app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default Application;
