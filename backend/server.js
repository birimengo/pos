// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { cloudinary } from './config/cloudinary.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Import routes from index.js
import routes from './routes/index.js';

// Initialize express
const app = express();

// Connect to database
await connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
});

// Routes - use the routes index
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'BizCore POS API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      customers: '/api/customers',
      transactions: '/api/transactions',
      sync: '/api/sync',
      stores: '/api/stores',
      settings: '/api/settings'
    }
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Database: bizcore_pos (MongoDB Atlas)`);
  console.log(`☁️  Cloudinary: ${cloudinary.config().cloud_name || 'do2bbokxv'}`);
  console.log(`📦 Ready for connections`);
  console.log(`🔐 Auth endpoints available at /api/auth`);
  console.log(`🏪 Store endpoints available at /api/stores`);
  console.log(`⚙️  Settings endpoints available at /api/settings`);
  console.log('='.repeat(50));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Closing server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Closing server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;