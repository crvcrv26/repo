const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const SuperSuperAdminPayment = require('../models/SuperSuperAdminPayment');
const SuperSuperAdminPaymentRate = require('../models/SuperSuperAdminPaymentRate');
const User = require('../models/User');

// Helper function to get last day of month
function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// Helper function to calculate due date (end of month)
function calculateDueDate(year, month) {
  const lastDay = getLastDayOfMonth(year, month);
  return new Date(year, month - 1, lastDay, 23, 59, 59, 999);
}

const updatePaymentUserCounts = async () => {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get current rates
    const currentRate = await SuperSuperAdminPaymentRate.findOne({ isActive: true });
    if (!currentRate) {
      console.log('❌ No active payment rates found');
      return;
    }

    console.log('📊 Current rates:', {
      perUserRate: currentRate.perUserRate,
      serviceRate: currentRate.serviceRate
    });

    // Get all payments
    const payments = await SuperSuperAdminPayment.find({})
      .populate('superAdminId', 'name email createdAt')
      .populate('superSuperAdminId', 'name email');

    console.log(`📋 Found ${payments.length} payments to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const payment of payments) {
      try {
        const [year, monthNum] = payment.month.split('-').map(Number);
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

        // Count ALL users for this specific month (not just users created by this SuperAdmin):
        // 1. Users who were active at the end of the month (created before/during month AND not deleted by end of month)
        // 2. PLUS users who were deleted within this month (regardless of when they were created)
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

        const newUserCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth;
        const newDeletedUserCount = usersDeletedInThisMonth;

        // Calculate proration for service charge if super admin was created mid-month
        let isProrated = false;
        let proratedDays = 0;
        let totalDaysInMonth = getLastDayOfMonth(year, monthNum);
        let proratedServiceRate = currentRate.serviceRate;

        if (payment.superAdminId && payment.superAdminId.createdAt >= startOfMonth && payment.superAdminId.createdAt <= endOfMonth) {
          const superAdminCreatedDay = payment.superAdminId.createdAt.getDate();
          const remainingDays = totalDaysInMonth - superAdminCreatedDay + 1;
          
          if (remainingDays < totalDaysInMonth) {
            isProrated = true;
            proratedDays = remainingDays;
            proratedServiceRate = Math.round((currentRate.serviceRate / totalDaysInMonth) * remainingDays);
          }
        }

        const newUserAmount = newUserCount * currentRate.perUserRate;
        const newTotalAmount = newUserAmount + proratedServiceRate;

        // Log the changes
        console.log(`\n📊 Payment ${payment._id} (${payment.month}):`);
        console.log(`   Super Admin: ${payment.superAdminId?.name || 'Unknown'}`);
        console.log(`   Old user count: ${payment.userCount} → New user count: ${newUserCount}`);
        console.log(`   Old deleted count: ${payment.deletedUserCount || 0} → New deleted count: ${newDeletedUserCount}`);
        console.log(`   Old user amount: ₹${payment.userAmount} → New user amount: ₹${newUserAmount}`);
        console.log(`   Old total amount: ₹${payment.totalAmount} → New total amount: ₹${newTotalAmount}`);

        // Update the payment
        payment.userCount = newUserCount;
        payment.deletedUserCount = newDeletedUserCount;
        payment.perUserRate = currentRate.perUserRate;
        payment.serviceRate = currentRate.serviceRate;
        payment.isProrated = isProrated;
        payment.proratedDays = proratedDays;
        payment.totalDaysInMonth = totalDaysInMonth;
        payment.proratedServiceRate = proratedServiceRate;
        payment.userAmount = newUserAmount;
        payment.totalAmount = newTotalAmount;

        await payment.save();
        updatedCount++;

        console.log(`   ✅ Updated successfully`);

      } catch (error) {
        console.error(`   ❌ Error updating payment ${payment._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Update completed!`);
    console.log(`✅ Successfully updated: ${updatedCount} payments`);
    console.log(`❌ Errors: ${errorCount} payments`);

  } catch (error) {
    console.error('❌ Error updating payment user counts:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
updatePaymentUserCounts();
