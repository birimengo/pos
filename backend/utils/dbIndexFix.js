import mongoose from 'mongoose';

export const fixDatabaseIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Check and drop problematic id index from customers collection
    const customersCollection = db.collection('customers');
    const customerIndexes = await customersCollection.indexes();
    
    console.log('🔍 Checking customers collection indexes...');
    
    // Log all indexes for debugging
    customerIndexes.forEach(idx => {
      console.log(`   Index: ${idx.name} - Keys:`, idx.key);
    });
    
    // Check for id_1 index (the problematic one)
    const hasIdIndex = customerIndexes.some(idx => idx.name === 'id_1');
    
    if (hasIdIndex) {
      console.log('⚠️ Found problematic id_1 index in customers collection. Dropping...');
      await customersCollection.dropIndex('id_1');
      console.log('✅ Successfully dropped id_1 index from customers collection');
    }
    
    // Check if we need to create the email index with unique constraint
    const emailIndex = customerIndexes.find(idx => idx.name === 'email_1');
    
    if (!emailIndex) {
      console.log('📧 Creating email index...');
      await customersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
      console.log('✅ Created email index on customers collection');
    } else if (!emailIndex.unique) {
      // If index exists but isn't unique, drop and recreate
      console.log('📧 Recreating email index with unique constraint...');
      await customersCollection.dropIndex('email_1');
      await customersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
      console.log('✅ Recreated email index with unique constraint');
    } else {
      console.log('✅ Email index already exists with correct options');
    }
    
  } catch (indexError) {
    console.error('❌ Error fixing indexes:', indexError.message);
    // Don't throw, just log the error
  }
};