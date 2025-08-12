const mongoose = require('mongoose');
require('dotenv').config();

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

    // Create Super Super Admin
    const superSuperAdminData = {
      name: 'Super Super Admin',
      email: 'supersuperadmin@example.com',
      phone: '1234567890',
      password: 'SuperSuperAdmin123!',
      role: 'superSuperAdmin',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        coordinates: [72.8777, 19.0760]
      },
      emailVerified: true,
      phoneVerified: true,
      isActive: true
    };

    // Check if Super Super Admin already exists
    let superSuperAdmin = await User.findOne({ email: superSuperAdminData.email });
    if (superSuperAdmin) {
      console.log('👑 Super Super Admin already exists!');
      console.log('📧 Email:', superSuperAdminData.email);
      console.log('📱 Phone:', superSuperAdminData.phone);
      console.log('🔑 Password:', superSuperAdminData.password);
    } else {
      superSuperAdmin = new User(superSuperAdminData);
      await superSuperAdmin.save();
      console.log('👑 Super Super Admin created successfully!');
      console.log('📧 Email:', superSuperAdminData.email);
      console.log('📱 Phone:', superSuperAdminData.phone);
      console.log('🔑 Password:', superSuperAdminData.password);
    }

    // Create Super Admin
    const superAdminData = {
      name: 'Super Admin',
      email: 'superadmin@example.com',
      phone: '9876543210',
      password: 'SuperAdmin123!',
      role: 'superAdmin',
      location: {
        city: 'Delhi',
        state: 'Delhi',
        coordinates: [77.2090, 28.6139]
      },
      emailVerified: true,
      phoneVerified: true,
      isActive: true
    };

    // Check if Super Admin already exists
    let superAdmin = await User.findOne({ email: superAdminData.email });
    if (superAdmin) {
      console.log('👨‍💼 Super Admin already exists!');
      console.log('📧 Email:', superAdminData.email);
      console.log('📱 Phone:', superAdminData.phone);
      console.log('🔑 Password:', superAdminData.password);
    } else {
      superAdmin = new User(superAdminData);
      await superAdmin.save();
      console.log('👨‍💼 Super Admin created successfully!');
      console.log('📧 Email:', superAdminData.email);
      console.log('📱 Phone:', superAdminData.phone);
      console.log('🔑 Password:', superAdminData.password);
    }

    console.log('\n🎉 Both admin users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('👑 Super Super Admin: supersuperadmin@example.com / SuperSuperAdmin123!');
    console.log('👨‍💼 Super Admin: superadmin@example.com / SuperAdmin123!');

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
