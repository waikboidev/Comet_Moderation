const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

async function connectDB(uri) {
  try {
    await mongoose.connect(uri);
    logger.success('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

module.exports = { connectDB };
