const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const checkUserCounting = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Let's check for August 2025 (current month)
    const year = 2025;
    const monthNum = 8; // August
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

    console.log(`\n📅 Checking user count for ${year}-${String(monthNum).padStart(2, '0')}`);
    console.log(`   Start of month: ${startOfMonth.toISOString()}`);
    console.log(`   End of month: ${endOfMonth.toISOString()}`);

    // Current logic: Count ALL users for this specific month
    const activeUsersAtEndOfMonth = await User.countDocuments({
      role: { $in: ['admin', 'fieldAgent', 'auditor'] },
      createdAt: { $lte: endOfMonth }, // Created before or during the month
      $or: [
        { isDeleted: false },
        { isDeleted: true, deletedAt: { $gt: endOfMonth } } // Deleted after this month
      ]
    });

    const usersDeletedInThisMonth = await User.countDocuments({
      role: { $in: ['admin', 'fieldAgent', 'auditor'] },
      isDeleted: true,
      deletedAt: { $gte: startOfMonth, $lte: endOfMonth } // Deleted within this month
    });

    const totalUserCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth;

    console.log('\n📊 Current counting logic results:');
    console.log(`   Active users at end of month: ${activeUsersAtEndOfMonth}`);
    console.log(`   Users deleted in this month: ${usersDeletedInThisMonth}`);
    console.log(`   Total user count: ${totalUserCount}`);

    // Let's see the details
    console.log('\n🔍 Detailed breakdown:');
    
    // Active users at end of month
    const activeUsers = await User.find({
      role: { $in: ['admin', 'fieldAgent', 'auditor'] },
      createdAt: { $lte: endOfMonth },
      $or: [
        { isDeleted: false },
        { isDeleted: true, deletedAt: { $gt: endOfMonth } }
      ]
    }, 'name email role isDeleted deletedAt createdAt');

    console.log('\n✅ Active users at end of month:');
    activeUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.role}) - Created: ${user.createdAt.toISOString().split('T')[0]}`);
    });

    // Users deleted in this month
    const deletedUsers = await User.find({
      role: { $in: ['admin', 'fieldAgent', 'auditor'] },
      isDeleted: true,
      deletedAt: { $gte: startOfMonth, $lte: endOfMonth }
    }, 'name email role deletedAt createdAt');

    console.log('\n🗑️ Users deleted in this month:');
    deletedUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.role}) - Deleted: ${user.deletedAt.toISOString().split('T')[0]}`);
    });

    // Alternative: Maybe you want to count ALL users regardless of role?
    const allUsersCount = await User.countDocuments({
      createdAt: { $lte: endOfMonth },
      $or: [
        { isDeleted: false },
        { isDeleted: true, deletedAt: { $gt: endOfMonth } }
      ]
    });

    const allUsersDeletedInMonth = await User.countDocuments({
      isDeleted: true,
      deletedAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    console.log('\n🤔 Alternative: Count ALL users (all roles):');
    console.log(`   All active users at end of month: ${allUsersCount}`);
    console.log(`   All users deleted in this month: ${allUsersDeletedInMonth}`);
    console.log(`   Total all users: ${allUsersCount + allUsersDeletedInMonth}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUserCounting();
