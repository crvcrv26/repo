const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect('mongodb://localhost:27017/repoApp')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const users = await User.find({}, 'name email role profileImage');
    console.log('\nAll users and their profile images:');
    users.forEach(u => {
      console.log(`${u.name} (${u.email}) - ${u.role}: ${u.profileImage || 'No image'}`);
    });
    
    // Count users with profile images
    const usersWithImages = users.filter(u => u.profileImage);
    console.log(`\nSummary: ${usersWithImages.length} out of ${users.length} users have profile images`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
