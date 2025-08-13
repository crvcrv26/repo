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

// Test profile image functionality
const testProfileImage = async () => {
  try {
    console.log('🧪 Testing Profile Image Functionality...\n');
    
    // Find a test user
    const testUser = await User.findOne({ role: 'admin' });
    
    if (!testUser) {
      console.log('❌ No test user found. Please create a user first.');
      return;
    }

    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`);
    console.log(`   Current profile image: ${testUser.profileImage || 'None'}`);
    
    // Check if there are any uploaded images
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profile-images');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`   Found ${files.length} uploaded images in directory`);
      
      if (files.length > 0) {
        // Use the first available image
        const imageFile = files[0];
        const imagePath = `/uploads/profile-images/${imageFile}`;
        
        console.log(`   Using image: ${imageFile}`);
        console.log(`   Image path: ${imagePath}`);
        
        // Update the user's profile image
        const updatedUser = await User.findByIdAndUpdate(
          testUser._id,
          { profileImage: imagePath },
          { new: true, runValidators: true }
        );
        
        console.log('✅ Profile image updated successfully');
        console.log(`   New profile image: ${updatedUser.profileImage}`);
        
        // Test the image URL construction
        const API_BASE_URL = 'http://localhost:5000/api';
        const backendUrl = API_BASE_URL.replace('/api', '');
        const fullImageUrl = `${backendUrl}${imagePath}`;
        
        console.log(`   Full image URL: ${fullImageUrl}`);
        
        // Test if the image is accessible
        const axios = require('axios');
        try {
          const response = await axios.get(fullImageUrl, { timeout: 5000 });
          console.log('✅ Image is accessible via HTTP');
          console.log(`   HTTP Status: ${response.status}`);
          console.log(`   Content-Type: ${response.headers['content-type']}`);
        } catch (error) {
          console.log('❌ Image is not accessible via HTTP');
          console.log(`   Error: ${error.message}`);
        }
        
      } else {
        console.log('❌ No uploaded images found. Please upload an image first.');
      }
    } else {
      console.log('❌ Uploads directory does not exist.');
    }

    console.log('\n🎉 Profile Image Test Completed!');

  } catch (error) {
    console.error('❌ Profile image test failed:', error);
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testProfileImage();
  process.exit(0);
};

runTest();
