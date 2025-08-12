const mongoose = require('mongoose');
require('dotenv').config();

const flushDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    await mongoose.connection.db.dropDatabase();
    console.log('🗑️ Entire database dropped successfully!');

  } catch (error) {
    console.error('❌ Error flushing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

flushDatabase();
