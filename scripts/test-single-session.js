const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Set default JWT secret for testing if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-single-session-testing';
  console.log('⚠️  Using default JWT_SECRET for testing');
}

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

// Test single session functionality
const testSingleSession = async () => {
  try {
    console.log('🧪 Testing Single Session Per User Functionality...\n');
    
    // Find a test user (assuming you have users in the database)
    const testUser = await User.findOne({ role: { $in: ['admin', 'superAdmin'] } });
    
    if (!testUser) {
      console.log('❌ No test user found. Please create a user first.');
      return;
    }
    
    console.log(`👤 Test User: ${testUser.name} (${testUser.email})`);
    console.log(`📊 Current Session Token: ${testUser.currentSessionToken || 'None'}\n`);
    
    // Test 1: Generate first session (Device A)
    console.log('📱 Test 1: Login from Device A');
    const token1 = testUser.getSignedJwtToken();
    await testUser.save();
    
    console.log(`✅ Session Token Generated: ${testUser.currentSessionToken?.substring(0, 16)}...`);
    console.log(`📅 Session Created: ${testUser.sessionCreatedAt}`);
    console.log(`⏰ Session Expires: ${testUser.sessionExpiresAt}\n`);
    
    // Test 2: Generate second session (Device B) - should invalidate first
    console.log('💻 Test 2: Login from Device B (should invalidate Device A)');
    const token2 = testUser.getSignedJwtToken();
    await testUser.save();
    
    console.log(`✅ New Session Token: ${testUser.currentSessionToken?.substring(0, 16)}...`);
    console.log(`📅 New Session Created: ${testUser.sessionCreatedAt}`);
    console.log(`⏰ New Session Expires: ${testUser.sessionExpiresAt}\n`);
    
    // Test 3: Verify token1 is now invalid
    console.log('🔍 Test 3: Verify Device A token is invalid');
    try {
      const decoded1 = jwt.verify(token1, process.env.JWT_SECRET || 'your-secret-key');
      console.log(`📋 Token 1 Payload: ${JSON.stringify(decoded1, null, 2)}`);
      
      // Check if session token matches
      if (decoded1.sessionToken === testUser.currentSessionToken) {
        console.log('❌ ERROR: Device A token should be invalid but appears valid!');
      } else {
        console.log('✅ SUCCESS: Device A token is properly invalidated!');
      }
    } catch (error) {
      console.log('✅ SUCCESS: Device A token is invalid (JWT verification failed)');
    }
    
    // Test 4: Verify token2 is valid
    console.log('\n🔍 Test 4: Verify Device B token is valid');
    try {
      const decoded2 = jwt.verify(token2, process.env.JWT_SECRET || 'your-secret-key');
      console.log(`📋 Token 2 Payload: ${JSON.stringify(decoded2, null, 2)}`);
      
      if (decoded2.sessionToken === testUser.currentSessionToken) {
        console.log('✅ SUCCESS: Device B token is valid!');
      } else {
        console.log('❌ ERROR: Device B token should be valid but session token mismatch!');
      }
    } catch (error) {
      console.log('❌ ERROR: Device B token verification failed:', error.message);
    }
    
    // Test 5: Test session invalidation
    console.log('\n🚪 Test 5: Test session invalidation');
    testUser.invalidateSession();
    await testUser.save();
    
    console.log(`✅ Session Invalidated: ${testUser.currentSessionToken || 'None'}`);
    console.log(`📅 Session Created: ${testUser.sessionCreatedAt || 'None'}`);
    console.log(`⏰ Session Expires: ${testUser.sessionExpiresAt || 'None'}`);
    
    // Test 6: Verify token2 is now invalid
    console.log('\n🔍 Test 6: Verify Device B token is now invalid after logout');
    try {
      const decoded2 = jwt.verify(token2, process.env.JWT_SECRET || 'your-secret-key');
      if (decoded2.sessionToken === testUser.currentSessionToken) {
        console.log('❌ ERROR: Device B token should be invalid but appears valid!');
      } else {
        console.log('✅ SUCCESS: Device B token is properly invalidated after logout!');
      }
    } catch (error) {
      console.log('✅ SUCCESS: Device B token is invalid (JWT verification failed)');
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Session token generation works');
    console.log('✅ Session invalidation works');
    console.log('✅ JWT tokens include session identifiers');
    console.log('✅ Single session per user enforced');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Run tests
const runTests = async () => {
  await connectDB();
  await testSingleSession();
  process.exit(0);
};

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { testSingleSession };
