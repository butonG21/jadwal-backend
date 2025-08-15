export interface AppConfig {
    // Server Configuration
    PORT: number;
    NODE_ENV: 'development' | 'production' | 'test';
    
    // Database Configuration
    MONGO_URI: string;
    
    // Security Configuration
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    
    // External Services
    ATTENDANCE_API_URL: string;
    
    // ImageKit Configuration
    IMAGEKIT_PUBLIC_KEY: string;
    IMAGEKIT_PRIVATE_KEY: string;
    IMAGEKIT_URL_ENDPOINT: string;
    
    // CORS Configuration
    CORS_ORIGINS?: string;
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
  }
  
  const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY',
    'IMAGEKIT_URL_ENDPOINT'
  ];
  
  export function validateEnvironment(): AppConfig {
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  
    return {
      PORT: parseInt(process.env.PORT || '5000', 10),
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      MONGO_URI: process.env.MONGO_URI!,
      JWT_SECRET: process.env.JWT_SECRET!,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      ATTENDANCE_API_URL: process.env.ATTENDANCE_API_URL
      IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY!,
      IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY!,
      IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT!,
      CORS_ORIGINS: process.env.CORS_ORIGINS,
      RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10)
    };
  }