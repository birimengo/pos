import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { cloudinary } from './config/cloudinary.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './routes/health.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import transactionRoutes from './routes/transactions.js';
import syncRoutes from './routes/sync.js';

// Initialize express
const app = express();

// Connect to database
await connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/sync', syncRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'BizCore POS API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      customers: '/api/customers',
      transactions: '/api/transactions',
      sync: '/api/sync'
    }
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Database: bizcore_pos (MongoDB Atlas)`);
  console.log(`☁️  Cloudinary: ${cloudinary.config().cloud_name || 'do2bbokxv'}`);
  console.log(`📦 Ready for connections`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  // server.close(() => process.exit(1));
});

export default app;