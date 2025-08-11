const mongoose = require('mongoose');
const PaymentProof = require('./models/PaymentProof');
const AdminPayment = require('./models/AdminPayment');
const User = require('./models/User');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://aadouble96:AuHhiWU95wirSx7X@repodb.5epjwo3.mongodb.net/repo_app?retryWrites=true&w=majority&appName=repodb';

async function debugPaymentProofs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check AdminPayment records
    console.log(`\n💰 AdminPayment Records:`);
    const adminPayments = await AdminPayment.find({}).populate('adminId', 'name email role').populate('superAdminId', 'name email role');
    console.log(`Total admin payments: ${adminPayments.length}`);

    if (adminPayments.length > 0) {
      adminPayments.forEach((payment, index) => {
        console.log(`\n${index + 1}. Payment ID: ${payment._id}`);
        console.log(`   Admin: ${payment.adminId.name} (${payment.adminId.email}) - ${payment.adminId.role}`);
        console.log(`   Super Admin: ${payment.superAdminId.name} (${payment.superAdminId.email}) - ${payment.superAdminId.role}`);
        console.log(`   Month: ${payment.month}`);
        console.log(`   Amount: ₹${payment.totalAmount}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Payment Proof: ${payment.paymentProof || 'None'}`);
      });
    }

    // Check the specific user ID from the network response
    const specificUserId = '689660b06c603a5ab0889b72';
    const specificUser = await User.findById(specificUserId);
    console.log(`\n🔍 User with ID ${specificUserId}:`);
    if (specificUser) {
      console.log(`   Name: ${specificUser.name}`);
      console.log(`   Email: ${specificUser.email}`);
      console.log(`   Role: ${specificUser.role}`);
    } else {
      console.log(`   ❌ User not found`);
    }

    // Check for payment proofs with this adminId
    const proofsWithSpecificAdminId = await PaymentProof.find({ 
      adminId: specificUserId 
    }).populate('userId', 'name email role');

    console.log(`\n🔍 Payment Proofs with adminId ${specificUserId}:`);
    console.log(`Total proofs: ${proofsWithSpecificAdminId.length}`);

    if (proofsWithSpecificAdminId.length > 0) {
      proofsWithSpecificAdminId.forEach((proof, index) => {
        console.log(`\n${index + 1}. Proof ID: ${proof._id}`);
        console.log(`   User: ${proof.userId.name} (${proof.userId.email}) - ${proof.userId.role}`);
        console.log(`   Payment ID: ${proof.paymentId || 'NULL'}`);
        console.log(`   Amount: ₹${proof.amount}`);
        console.log(`   Status: ${proof.status}`);
        console.log(`   Proof Type: ${proof.proofType}`);
        console.log(`   Created: ${proof.createdAt}`);
      });
    }

    // Find all Super Admin users
    const superAdmins = await User.find({ 
      role: { $in: ['superAdmin', 'superSuperAdmin'] } 
    });

    console.log(`\n👑 Found ${superAdmins.length} Super Admin users:`);
    superAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email}) - ID: ${admin._id} - Role: ${admin.role}`);
    });

    // Check payment proofs for each Super Admin
    for (const superAdmin of superAdmins) {
      console.log(`\n📊 Payment Proofs for ${superAdmin.name} (${superAdmin._id}):`);
      
      const allProofs = await PaymentProof.find({ 
        adminId: superAdmin._id 
      }).populate('userId', 'name email role');

      console.log(`Total proofs: ${allProofs.length}`);

      if (allProofs.length > 0) {
        allProofs.forEach((proof, index) => {
          console.log(`\n${index + 1}. Proof ID: ${proof._id}`);
          console.log(`   User: ${proof.userId.name} (${proof.userId.email}) - ${proof.userId.role}`);
          console.log(`   Payment ID: ${proof.paymentId || 'NULL'}`);
          console.log(`   Amount: ₹${proof.amount}`);
          console.log(`   Status: ${proof.status}`);
          console.log(`   Proof Type: ${proof.proofType}`);
          console.log(`   Created: ${proof.createdAt}`);
        });

        // Check pending proofs specifically
        const pendingProofs = allProofs.filter(proof => proof.status === 'pending');
        console.log(`\n⏳ Pending Payment Proofs: ${pendingProofs.length}`);
      }
    }

    // Check all payment proofs in the system
    console.log(`\n🔍 All Payment Proofs in System:`);
    const allSystemProofs = await PaymentProof.find({}).populate('userId', 'name email role').populate('adminId', 'name email role');
    console.log(`Total system proofs: ${allSystemProofs.length}`);

    allSystemProofs.forEach((proof, index) => {
      console.log(`\n${index + 1}. Proof ID: ${proof._id}`);
      console.log(`   User: ${proof.userId.name} (${proof.userId.email}) - ${proof.userId.role}`);
      console.log(`   Admin: ${proof.adminId ? `${proof.adminId.name} (${proof.adminId.email}) - ${proof.adminId.role}` : 'NULL'}`);
      console.log(`   Payment ID: ${proof.paymentId || 'NULL'}`);
      console.log(`   Amount: ₹${proof.amount}`);
      console.log(`   Status: ${proof.status}`);
      console.log(`   Proof Type: ${proof.proofType}`);
      console.log(`   Created: ${proof.createdAt}`);
    });

    // Check for orphaned proofs (proofs with adminId that don't exist)
    console.log(`\n🔍 Checking for orphaned proofs (adminId doesn't exist):`);
    const allProofs = await PaymentProof.find({});
    const allUserIds = await User.find({}, '_id');
    const existingUserIds = allUserIds.map(user => user._id.toString());
    
    const orphanedProofs = allProofs.filter(proof => {
      return proof.adminId && !existingUserIds.includes(proof.adminId.toString());
    });

    console.log(`Found ${orphanedProofs.length} orphaned proofs:`);
    orphanedProofs.forEach((proof, index) => {
      console.log(`\n${index + 1}. Proof ID: ${proof._id}`);
      console.log(`   Admin ID: ${proof.adminId} (does not exist)`);
      console.log(`   User ID: ${proof.userId}`);
      console.log(`   Amount: ₹${proof.amount}`);
      console.log(`   Status: ${proof.status}`);
      console.log(`   Created: ${proof.createdAt}`);
    });

    console.log('\n✅ Debug completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugPaymentProofs();
