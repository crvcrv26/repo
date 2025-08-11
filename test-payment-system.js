const mongoose = require('mongoose');
const User = require('./models/User');
const Payment = require('./models/Payment');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/repoApp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Helper function to calculate period start date
function calculatePeriodStart(creationDate, targetMonth, targetYear) {
  const creationMonth = creationDate.getMonth() + 1;
  const creationYear = creationDate.getFullYear();
  
  // If this is the creation month, start from creation date
  if (targetMonth === creationMonth && targetYear === creationYear) {
    return new Date(creationDate);
  }
  
  // For subsequent months, start from 1st of the month
  return new Date(targetYear, targetMonth - 1, 1);
}

// Helper function to calculate prorated amount for first month
function calculateProratedAmount(fullAmount, creationDate, targetMonth, targetYear) {
  const creationMonth = creationDate.getMonth() + 1;
  const creationYear = creationDate.getFullYear();
  
  // If not the creation month, return full amount
  if (targetMonth !== creationMonth || targetYear !== creationYear) {
    return fullAmount;
  }
  
  // Calculate prorated amount for creation month
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const creationDay = creationDate.getDate();
  const remainingDays = daysInMonth - creationDay + 1; // +1 to include creation day
  const dailyRate = fullAmount / daysInMonth;
  
  return Math.round(dailyRate * remainingDays * 100) / 100; // Round to 2 decimal places
}

async function testPaymentSystem() {
  try {
    // 1. Create test admin
    const admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      phone: '1234567890',
      password: 'password123',
      role: 'admin',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra'
      },
      paymentRates: {
        auditorRate: 5000,
        fieldAgentRate: 3000
      }
    });

    // 2. Create test auditor
    const auditor = await User.create({
      name: 'Test Auditor',
      email: 'auditor@test.com',
      phone: '1234567891',
      password: 'password123',
      role: 'auditor',
      createdBy: admin._id,
      location: {
        city: 'Mumbai',
        state: 'Maharashtra'
      }
    });

    // 3. Create test field agent
    const fieldAgent = await User.create({
      name: 'Test Field Agent',
      email: 'fieldagent@test.com',
      phone: '1234567892',
      password: 'password123',
      role: 'fieldAgent',
      createdBy: admin._id,
      location: {
        city: 'Mumbai',
        state: 'Maharashtra'
      }
    });

    // 4. Generate payments for current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Create payment for auditor
    const auditorPeriodStart = calculatePeriodStart(auditor.createdAt, currentMonth, currentYear);
    const auditorPeriodEnd = new Date(currentYear, currentMonth, 0); // Last day of the month
    const auditorDueDate = new Date(currentYear, currentMonth, 0); // Last day of the month
    const auditorAmount = calculateProratedAmount(admin.paymentRates.auditorRate, auditor.createdAt, currentMonth, currentYear);
    
    const auditorPayment = await Payment.create({
      adminId: admin._id,
      userId: auditor._id,
      userRole: 'auditor',
      monthlyAmount: auditorAmount,
      paymentMonth: currentMonth,
      paymentYear: currentYear,
      periodStart: auditorPeriodStart,
      periodEnd: auditorPeriodEnd,
      dueDate: auditorDueDate,
      userCreatedAt: auditor.createdAt,
      status: 'pending'
    });

    // Create payment for field agent
    const fieldAgentPeriodStart = calculatePeriodStart(fieldAgent.createdAt, currentMonth, currentYear);
    const fieldAgentPeriodEnd = new Date(currentYear, currentMonth, 0); // Last day of the month
    const fieldAgentDueDate = new Date(currentYear, currentMonth, 0); // Last day of the month
    const fieldAgentAmount = calculateProratedAmount(admin.paymentRates.fieldAgentRate, fieldAgent.createdAt, currentMonth, currentYear);
    
    const fieldAgentPayment = await Payment.create({
      adminId: admin._id,
      userId: fieldAgent._id,
      userRole: 'fieldAgent',
      monthlyAmount: fieldAgentAmount,
      paymentMonth: currentMonth,
      paymentYear: currentYear,
      periodStart: fieldAgentPeriodStart,
      periodEnd: fieldAgentPeriodEnd,
      dueDate: fieldAgentDueDate,
      userCreatedAt: fieldAgent.createdAt,
      status: 'pending'
    });

    // 5. Mark one payment as paid
    fieldAgentPayment.status = 'paid';
    fieldAgentPayment.paidAmount = fieldAgentPayment.monthlyAmount;
    fieldAgentPayment.paidDate = new Date();
    await fieldAgentPayment.save();

    // 6. Create an overdue payment (previous month)
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    const overduePeriodStart = calculatePeriodStart(auditor.createdAt, previousMonth, previousYear);
    const overduePeriodEnd = new Date(previousYear, previousMonth, 0); // Last day of the month
    const overdueDueDate = new Date(previousYear, previousMonth, 0); // Last day of the month
    const overdueAmount = calculateProratedAmount(admin.paymentRates.auditorRate, auditor.createdAt, previousMonth, previousYear);
    
    const overduePayment = await Payment.create({
      adminId: admin._id,
      userId: auditor._id,
      userRole: 'auditor',
      monthlyAmount: overdueAmount,
      paymentMonth: previousMonth,
      paymentYear: previousYear,
      periodStart: overduePeriodStart,
      periodEnd: overduePeriodEnd,
      dueDate: overdueDueDate,
      userCreatedAt: auditor.createdAt,
      status: 'overdue'
    });

    console.log('Payment system test completed successfully!');
    console.log('Test Data Created:');
    console.log(`   - Admin: ${admin.email} (Password: password123)`);
    console.log(`   - Auditor: ${auditor.email} (Password: password123)`);
    console.log(`   - Field Agent: ${fieldAgent.email} (Password: password123)`);

  } catch (error) {
    console.error('Error testing payment system:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testPaymentSystem();
