import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start Express server only after database connection succeeds
    app.listen(PORT, () => {
      console.log(`[Server] Git Repository Security Dashboard API listening on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(`[Server Error] Server failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();
