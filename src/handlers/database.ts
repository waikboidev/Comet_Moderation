import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDB(uri: string) {
  try {
    await mongoose.connect(uri);
    logger.success('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}
