import dns from 'dns';
import mongoose from 'mongoose';

/**
 * Connects to MongoDB database using connection string from environment variables.
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    const errorMsg = 'MONGO_URI is not defined in environment variables.';
    console.error(`[Database Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    // Configure Node.js DNS resolver to use 8.8.8.8 before connecting to resolve MongoDB SRV records
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    const conn = await mongoose.connect(mongoUri, {
      dbName: 'test',
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} | Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    const rootCause = error.errorResponse?.errmsg || error.message;
    console.error(`[Database Error] Connection failed: ${rootCause}`);
    throw error;
  }
};
