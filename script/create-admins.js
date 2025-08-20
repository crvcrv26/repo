const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });


// Import User model
const User = require('../models/User.js');

const createAdmins = async () => {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Create Admin (only role supported now)
    const adminData = {
      name: 'Admin',
      email: 'admin@example.com',
      phone: '9876543210',
      password: 'Admin123!',
      role: 'admin',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        coordinates: [72.8777, 19.0760]
      },
      emailVerified: true,
      phoneVerified: true,
      isActive: true
    };

    // Check if Admin already exists
    let admin = await User.findOne({ email: adminData.email });
    if (admin) {
      console.log('👨‍💼 Admin already exists!');
      console.log('📧 Email:', adminData.email);
      console.log('📱 Phone:', adminData.phone);
      console.log('🔑 Password:', adminData.password);
    } else {
      admin = new User(adminData);
      await admin.save();
      console.log('👨‍💼 Admin created successfully!');
      console.log('📧 Email:', adminData.email);
      console.log('📱 Phone:', adminData.phone);
      console.log('🔑 Password:', adminData.password);
    }

    console.log('\n🎉 Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('👨‍💼 Admin: admin@example.com / Admin123!');

  } catch (error) {
    console.error('❌ Error creating admin users:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
createAdmins();