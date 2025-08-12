const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const checkUserRoles = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({}, 'role name email isDeleted deletedAt createdAt');
    
    console.log('\n📊 All users with their roles:');
    console.log('='.repeat(80));
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Deleted: ${user.isDeleted}`);
      console.log(`   Created: ${user.createdAt.toISOString().split('T')[0]}`);
      if (user.deletedAt) {
        console.log(`   Deleted At: ${user.deletedAt.toISOString().split('T')[0]}`);
      }
      console.log('');
    });

    // Count by role
    console.log('📈 User count by role:');
    console.log('='.repeat(40));
    const roleCounts = {};
    users.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    });
    
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`${role}: ${count}`);
    });

    console.log(`\n📊 Total users: ${users.length}`);

    // Check what roles are currently being counted
    const currentRoles = ['admin', 'fieldAgent', 'auditor'];
    const currentCount = users.filter(user => currentRoles.includes(user.role)).length;
    console.log(`\n🔍 Users with current counted roles (${currentRoles.join(', ')}): ${currentCount}`);

    // Show which users are being counted vs not counted
    console.log('\n✅ Users being counted:');
    users.filter(user => currentRoles.includes(user.role)).forEach(user => {
      console.log(`   - ${user.name} (${user.role})`);
    });

    console.log('\n❌ Users NOT being counted:');
    users.filter(user => !currentRoles.includes(user.role)).forEach(user => {
      console.log(`   - ${user.name} (${user.role})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUserRoles();
