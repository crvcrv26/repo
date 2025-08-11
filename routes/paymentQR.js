const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const PaymentQR = require('../models/PaymentQR');
const PaymentProof = require('../models/PaymentProof');
const Payment = require('../models/Payment');
const User = require('../models/User');

const router = express.Router();

// Configure multer for QR code uploads
const qrStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'payment-qr');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating QR upload directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'qr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for payment proof uploads
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'payment-proofs');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating proof upload directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const qrUpload = multer({
  storage: qrStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const proofUpload = multer({
  storage: proofStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get QR code (for users)
router.get('/qr', authenticateToken, async (req, res) => {
  try {
    console.log('User attempting to fetch QR code:', {
      userId: req.user._id,
      userRole: req.user.role,
      userName: req.user.name
    });
    
    const qrCode = await PaymentQR.findOne({ isActive: true })
      .populate('adminId', 'name email phone');
    
    console.log('QR code found:', qrCode);
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'No QR code found'
      });
    }
    
    res.json({
      success: true,
      data: qrCode
    });
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload/Update QR code (admin only)
router.post('/qr', authenticateToken, (req, res, next) => {
  console.log('User attempting QR upload:', {
    userId: req.user._id,
    userRole: req.user.role,
    userName: req.user.name
  });
  
  // Check if user has admin-level role
  if (!['superSuperAdmin', 'superAdmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Insufficient permissions. User role: ${req.user.role}, Required roles: superSuperAdmin, superAdmin, or admin`
    });
  }
  
  next();
}, (req, res, next) => {
  qrUpload.single('qrImage')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'QR image is required'
      });
    }

    const { description } = req.body;
    
    // Deactivate existing QR codes
    await PaymentQR.updateMany(
      { adminId: req.user._id }, // Use _id instead of id
      { isActive: false }
    );
    
    // Create new QR code
    const qrCode = new PaymentQR({
      adminId: req.user._id, // Use _id instead of id
      qrImageUrl: `/uploads/payment-qr/${req.file.filename}`,
      qrImageName: req.file.filename,
      description: description || ''
    });
    
    await qrCode.save();
    
    res.json({
      success: true,
      message: 'QR code uploaded successfully',
      data: qrCode
    });
  } catch (error) {
    console.error('Error uploading QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get admin's QR codes
router.get('/admin/qr', authenticateToken, (req, res, next) => {
  console.log('User attempting to fetch QR codes:', {
    userId: req.user._id,
    userRole: req.user.role,
    userName: req.user.name
  });
  
  // Check if user has admin-level role
  if (!['superSuperAdmin', 'superAdmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Insufficient permissions. User role: ${req.user.role}, Required roles: superSuperAdmin, superAdmin, or admin`
    });
  }
  
  next();
}, async (req, res) => {
  try {
    const qrCodes = await PaymentQR.find({ adminId: req.user._id }) // Use _id instead of id
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: qrCodes
    });
  } catch (error) {
    console.error('Error fetching admin QR codes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Submit payment proof
router.post('/proof', authenticateToken, (req, res, next) => {
  console.log('Payment proof submission attempt:', {
    userId: req.user._id,
    userRole: req.user.role,
    userName: req.user.name
  });
  
  // Check if user has required role
  if (!['auditor', 'fieldAgent'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Insufficient permissions. User role: ${req.user.role}, Required roles: auditor or fieldAgent`
    });
  }
  
  next();
}, (req, res, next) => {
  proofUpload.single('proofImage')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
  }, async (req, res) => {
    try {
      console.log('Received payment proof data:', {
        body: req.body,
        files: req.files,
        file: req.file
      });
      
            const { paymentId, proofType, transactionNumber, paymentDate, amount, notes } = req.body;
      
      // Ensure proofType is a string (not an array)
      const cleanProofType = Array.isArray(proofType) ? proofType[0] : proofType;
      
      console.log('Cleaned proofType:', cleanProofType);
      
      // Validate payment exists and belongs to user
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if proof already exists for this payment
    const existingProof = await PaymentProof.findOne({ paymentId });
    if (existingProof && existingProof.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Payment proof already submitted for this payment'
      });
    }
    
          // Validate proof type requirements
      if (cleanProofType === 'screenshot' && !req.file) {
        return res.status(400).json({
          success: false,
          message: 'Screenshot image is required'
        });
      }
      
      if (cleanProofType === 'transaction_number' && !transactionNumber) {
        return res.status(400).json({
          success: false,
          message: 'Transaction number is required'
        });
      }
    
          // Create or update payment proof
      let paymentProof;
      
      if (existingProof && existingProof.status === 'rejected') {
        // Update existing rejected proof
        existingProof.proofType = cleanProofType;
        existingProof.proofImageUrl = req.file ? `/uploads/payment-proofs/${req.file.filename}` : undefined;
        existingProof.proofImageName = req.file ? req.file.filename : undefined;
        existingProof.transactionNumber = cleanProofType === 'transaction_number' ? transactionNumber : undefined;
        existingProof.paymentDate = new Date(paymentDate);
        existingProof.amount = parseFloat(amount);
        existingProof.notes = notes || '';
        existingProof.status = 'pending'; // Reset to pending
        existingProof.adminNotes = ''; // Clear admin notes
        existingProof.reviewedBy = undefined;
        existingProof.reviewedAt = undefined;
        
        paymentProof = existingProof;
      } else {
        // Create new payment proof
        paymentProof = new PaymentProof({
          paymentId,
          userId: req.user._id,
          adminId: payment.adminId,
          proofType: cleanProofType,
          proofImageUrl: req.file ? `/uploads/payment-proofs/${req.file.filename}` : undefined,
          proofImageName: req.file ? req.file.originalname : undefined,
          transactionNumber: cleanProofType === 'transaction_number' ? transactionNumber : undefined,
          paymentDate: new Date(paymentDate),
          amount: parseFloat(amount),
          notes: notes || ''
        });
      }
    
    await paymentProof.save();
    
    res.json({
      success: true,
      message: existingProof && existingProof.status === 'rejected' 
        ? 'Payment proof resubmitted successfully' 
        : 'Payment proof submitted successfully',
      data: paymentProof
    });
  } catch (error) {
    console.error('Error submitting payment proof:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's payment proofs
router.get('/user/proofs', authenticateToken, authorizeRole('auditor', 'fieldAgent'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
         const query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }
    
    const proofs = await PaymentProof.find(query)
      .populate('paymentId')
      .populate('adminId', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await PaymentProof.countDocuments(query);
    
    res.json({
      success: true,
      data: proofs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user payment proofs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get admin's pending payment proofs
router.get('/admin/pending-proofs', authenticateToken, authorizeRole('superSuperAdmin', 'superAdmin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
          console.log('🔍 Regular Admin pending proofs query:');
      console.log('   User ID:', req.user._id);
      console.log('   User Role:', req.user.role);
      console.log('   User Name:', req.user.name);

      const proofs = await PaymentProof.find({ 
        adminId: req.user._id,
        status: 'pending'
      })
        .populate('paymentId')
        .populate('userId', 'name email phone role')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      console.log('   Found proofs:', proofs.length);
      proofs.forEach((proof, index) => {
        console.log(`   Proof ${index + 1}:`, {
          id: proof._id,
          adminId: proof.adminId,
          userId: proof.userId?.name,
          paymentId: proof.paymentId?._id || 'null',
          amount: proof.amount,
          status: proof.status
        });
      });
    
         const total = await PaymentProof.countDocuments({ 
      adminId: req.user._id,
      status: 'pending'
    });
    

    
    res.json({
      success: true,
      data: proofs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching pending payment proofs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Approve/Reject payment proof (admin only)
router.put('/proof/:proofId/review', authenticateToken, authorizeRole('superSuperAdmin', 'superAdmin', 'admin'), async (req, res) => {
  try {
    const { proofId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "approved" or "rejected"'
      });
    }
    
    const proof = await PaymentProof.findById(proofId);
    if (!proof) {
      return res.status(404).json({
        success: false,
        message: 'Payment proof not found'
      });
    }
    
         if (proof.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (proof.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment proof has already been reviewed'
      });
    }
    
    // Update proof status
    proof.status = status;
    proof.adminNotes = adminNotes || '';
         proof.reviewedBy = req.user._id;
    proof.reviewedAt = new Date();
    
    await proof.save();
    
    // If approved, update the payment status
    if (status === 'approved') {
      const payment = await Payment.findById(proof.paymentId);
      if (payment) {
        payment.status = 'paid';
        payment.paidAmount = proof.amount;
        payment.paidDate = proof.paymentDate;
        payment.notes = proof.notes;
        await payment.save();
      }
    }
    
    res.json({
      success: true,
      message: `Payment proof ${status} successfully`,
      data: proof
    });
  } catch (error) {
    console.error('Error reviewing payment proof:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all payment proofs for admin (with filters)
router.get('/admin/all-proofs', authenticateToken, authorizeRole('superSuperAdmin', 'superAdmin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, role } = req.query;
    
         const query = { adminId: req.user._id };
    if (status) {
      query.status = status;
    }
    
    const proofs = await PaymentProof.find(query)
      .populate('paymentId')
      .populate('userId', 'name email phone role')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Filter by role if specified
    let filteredProofs = proofs;
    if (role) {
      filteredProofs = proofs.filter(proof => proof.userId.role === role);
    }
    
    const total = await PaymentProof.countDocuments(query);
    
    res.json({
      success: true,
      data: filteredProofs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all payment proofs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Activate/Deactivate QR code (admin only)
router.put('/admin/qr/:qrId/toggle-active', authenticateToken, authorizeRole('superSuperAdmin', 'superAdmin', 'admin'), async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const qrCode = await PaymentQR.findById(qrId);
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }
    
    // Check if admin owns this QR code
    if (qrCode.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // If activating this QR code, deactivate all others first
    if (!qrCode.isActive) {
      await PaymentQR.updateMany(
        { adminId: req.user._id },
        { isActive: false }
      );
    }
    
    // Toggle the active status
    qrCode.isActive = !qrCode.isActive;
    await qrCode.save();
    
    res.json({
      success: true,
      message: `QR code ${qrCode.isActive ? 'activated' : 'deactivated'} successfully`,
      data: qrCode
    });
  } catch (error) {
    console.error('Error toggling QR code status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete QR code (admin only)
router.delete('/admin/qr/:qrId', authenticateToken, authorizeRole('superSuperAdmin', 'superAdmin', 'admin'), async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const qrCode = await PaymentQR.findById(qrId);
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }
    
    // Check if admin owns this QR code
    if (qrCode.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Don't allow deletion of active QR code
    if (qrCode.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active QR code. Please activate another QR code first.'
      });
    }
    
    // Delete the QR code
    await PaymentQR.findByIdAndDelete(qrId);
    
    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
