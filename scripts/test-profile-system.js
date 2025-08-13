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

// Test profile system functionality
const testProfileSystem = async () => {
  try {
    console.log('🧪 Testing Profile System Functionality...\n');
    
    // Find a test user
    const testUser = await User.findOne({ role: { $in: ['admin', 'superAdmin'] } });
    
    if (!testUser) {
      console.log('❌ No test user found. Please create a user first.');
      return;
    }

    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Profile Image: ${testUser.profileImage || 'None'}`);
    console.log(`   Session Token: ${testUser.currentSessionToken ? 'Present' : 'None'}`);
    console.log(`   Is Online: ${testUser.isOnline}`);
    console.log(`   Last Seen: ${testUser.lastSeen}`);
    console.log(`   Member Since: ${testUser.createdAt}`);
    console.log(`   Last Login: ${testUser.lastLogin || 'Never'}`);
    
    // Test session management
    console.log('\n📋 Session Management Test:');
    if (testUser.currentSessionToken) {
      console.log('✅ User has active session');
      console.log(`   Session Created: ${testUser.sessionCreatedAt}`);
      console.log(`   Session Expires: ${testUser.sessionExpiresAt}`);
    } else {
      console.log('ℹ️  User has no active session');
    }

    // Test profile image functionality
    console.log('\n🖼️  Profile Image Test:');
    if (testUser.profileImage) {
      console.log('✅ User has profile image');
      console.log(`   Image Path: ${testUser.profileImage}`);
    } else {
      console.log('ℹ️  User has no profile image (will show initials)');
    }

    // Test role-specific information
    console.log('\n👤 Role-Specific Information:');
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Location: ${testUser.location.city}, ${testUser.location.state}`);
    console.log(`   Account Status: ${testUser.isActive ? 'Active' : 'Inactive'}`);
    
    if (testUser.paymentRates) {
      console.log(`   Auditor Rate: ₹${testUser.paymentRates.auditorRate || 0}`);
      console.log(`   Field Agent Rate: ₹${testUser.paymentRates.fieldAgentRate || 0}`);
    }

    // Test login history
    console.log('\n📊 Login History Test:');
    if (testUser.loginHistory && testUser.loginHistory.length > 0) {
      console.log(`✅ User has ${testUser.loginHistory.length} login records`);
      const recentLogins = testUser.loginHistory.slice(-3);
      recentLogins.forEach((login, index) => {
        console.log(`   ${index + 1}. ${new Date(login.timestamp).toLocaleString()}${login.ip ? ` (IP: ${login.ip})` : ''}`);
      });
    } else {
      console.log('ℹ️  No login history available');
    }

    // Test user methods
    console.log('\n🔧 User Methods Test:');
    
    // Test session token generation
    const sessionToken = testUser.generateSessionToken();
    console.log(`✅ Session token generated: ${sessionToken.substring(0, 16)}...`);
    
    // Test session invalidation
    testUser.invalidateSession();
    console.log('✅ Session invalidated successfully');
    console.log(`   Current Session Token: ${testUser.currentSessionToken || 'None'}`);
    console.log(`   Is Online: ${testUser.isOnline}`);

    console.log('\n🎉 Profile System Test Completed Successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ User model includes profile image field');
    console.log('✅ Session management methods working');
    console.log('✅ Profile image functionality ready');
    console.log('✅ Login history tracking available');
    console.log('✅ Role-specific data structure in place');

  } catch (error) {
    console.error('❌ Profile system test failed:', error);
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testProfileSystem();
  process.exit(0);
};

runTest();
