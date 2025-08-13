const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/repoApp');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Migration function to add session fields to existing users
const migrateSessions = async () => {
  try {
    console.log('Starting session migration...');
    
    // Find all users that don't have session fields
    const usersToUpdate = await User.find({
      $or: [
        { currentSessionToken: { $exists: false } },
        { sessionCreatedAt: { $exists: false } },
        { sessionExpiresAt: { $exists: false } }
      ]
    });
    
    console.log(`Found ${usersToUpdate.length} users to update`);
    
    if (usersToUpdate.length === 0) {
      console.log('No users need migration. All users already have session fields.');
      return;
    }
    
    // Update each user to add session fields
    const updatePromises = usersToUpdate.map(user => {
      return User.findByIdAndUpdate(user._id, {
        $set: {
          currentSessionToken: null,
          sessionCreatedAt: null,
          sessionExpiresAt: null
        }
      }, { new: true });
    });
    
    await Promise.all(updatePromises);
    
    console.log(`Successfully migrated ${usersToUpdate.length} users`);
    
    // Verify migration
    const usersWithoutSessionFields = await User.find({
      $or: [
        { currentSessionToken: { $exists: false } },
        { sessionCreatedAt: { $exists: false } },
        { sessionExpiresAt: { $exists: false } }
      ]
    });
    
    if (usersWithoutSessionFields.length === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`❌ Migration incomplete. ${usersWithoutSessionFields.length} users still missing session fields.`);
    }
    
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateSessions();
  process.exit(0);
};

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateSessions };
