import mongoose from 'mongoose';
import { fixDatabaseIndexes } from '../utils/dbIndexFix.js';

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://birimengo:ham%402020@cluster0.7nms33p.mongodb.net/bizcore_pos?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📁 Database: bizcore_pos');
    
    // Fix any problematic indexes
    await fixDatabaseIndexes();
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

export default connectDB;