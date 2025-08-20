import mongoose from 'mongoose';
import { logger } from '../utils/loggers';

export async function connectDatabase(retryAttempts = 5): Promise<void> {
  let currentAttempt = 0;

  while (currentAttempt < retryAttempts) {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is not defined');
      }

      logger.info('🔄 Connecting to MongoDB Atlas...');

      const conn = await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        bufferCommands: false, // Disable mongoose buffering
      });

      logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
      logger.info(`📊 Database: ${conn.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return; // Success, exit the retry loop
      
    } catch (error) {
      currentAttempt++;
      logger.error(`❌ MongoDB connection attempt ${currentAttempt} failed:`, error);
      
      if (currentAttempt >= retryAttempts) {
        logger.error('❌ All MongoDB connection attempts failed');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, currentAttempt), 30000);
      logger.info(`⏳ Retrying MongoDB connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
