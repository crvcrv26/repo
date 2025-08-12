const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const SuperSuperAdminPaymentRate = require('../models/SuperSuperAdminPaymentRate');
const SuperSuperAdminPayment = require('../models/SuperSuperAdminPayment');
const PaymentQR = require('../models/PaymentQR');
const PaymentProof = require('../models/PaymentProof');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Configure multer for SuperSuperAdmin QR code uploads
const superSuperAdminQrStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'super-super-admin-qr');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'super-super-admin-qr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for super admin payment proof uploads
const superAdminProofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'super-admin-payment-proofs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'super-admin-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const superSuperAdminQrUpload = multer({
  storage: superSuperAdminQrStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const superAdminProofUpload = multer({
  storage: superAdminProofStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Helper function to get last day of month
function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// Helper function to calculate due date (end of month)
function calculateDueDate(year, month) {
  const lastDay = getLastDayOfMonth(year, month);
  return new Date(year, month - 1, lastDay, 23, 59, 59, 999);
}

// @desc    Get current payment rates (SuperSuperAdmin only)
// @route   GET /api/super-super-admin-payments/rates
// @access  Private (SuperSuperAdmin)
router.get('/rates', 
  authenticateToken, 
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const currentRate = await SuperSuperAdminPaymentRate.findOne({ isActive: true });
      
      res.json({
        success: true,
        data: currentRate
      });
    } catch (error) {
      console.error('Error fetching payment rates:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching payment rates'
      });
    }
  }
);

// @desc    Set/Update payment rates (SuperSuperAdmin only)
// @route   POST /api/super-super-admin-payments/rates
// @access  Private (SuperSuperAdmin)
router.post('/rates',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  [
    body('perUserRate').isNumeric().withMessage('Per user rate must be a number'),
    body('serviceRate').isNumeric().withMessage('Service rate must be a number'),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Deactivate current active rate
      await SuperSuperAdminPaymentRate.updateMany(
        { isActive: true },
        { isActive: false }
      );

      // Create new rate
      const newRate = new SuperSuperAdminPaymentRate({
        perUserRate: req.body.perUserRate,
        serviceRate: req.body.serviceRate,
        notes: req.body.notes,
        createdBy: req.user._id
      });

      await newRate.save();

      res.status(201).json({
        success: true,
        message: 'Payment rates updated successfully',
        data: newRate
      });

    } catch (error) {
      console.error('Error setting payment rates:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while setting payment rates'
      });
    }
  }
);

// @desc    Generate super admin payments for current month (SuperSuperAdmin only)
// @route   POST /api/super-super-admin-payments/generate
// @access  Private (SuperSuperAdmin)
router.post('/generate',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const { month = getCurrentMonth() } = req.body;
      
      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month format. Use YYYY-MM'
        });
      }

      // Get current rates
      const currentRate = await SuperSuperAdminPaymentRate.findOne({ isActive: true });
      if (!currentRate) {
        return res.status(400).json({
          success: false,
          message: 'No active payment rates found. Please set rates first.'
        });
      }

      // Get all super admins
      const superAdmins = await User.find({ role: 'superAdmin', isActive: true });
      
      const [year, monthNum] = month.split('-').map(Number);
      const dueDate = calculateDueDate(year, monthNum);
      
      const generatedPayments = [];
      const errors = [];

      for (const superAdmin of superAdmins) {
        try {
          // Define month boundaries for the specified month
          const startOfMonth = new Date(year, monthNum - 1, 1);
          const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

          // Count ALL users for this specific month (all roles):
          // 1. Users who were active at the end of the month (created before/during month AND not deleted)
          // 2. PLUS users who were deleted within this month (regardless of when they were created)
          const activeUsersAtEndOfMonth = await User.countDocuments({
            createdAt: { $lte: endOfMonth }, // Created before or during the month
            isDeleted: false // Only count active users
          });

          const usersDeletedInThisMonth = await User.countDocuments({
            isDeleted: true,
            deletedAt: { $gte: startOfMonth, $lte: endOfMonth } // Deleted within this month
          });

          const userCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth; // Count active users + deleted users in this month

          console.log(`📊 Super Admin ${superAdmin.name} (${superAdmin._id}) has ${userCount} users active during ${month}`);

          // Calculate proration for service charge if super admin was created mid-month
          let isProrated = false;
          let proratedDays = 0;
          let totalDaysInMonth = getLastDayOfMonth(year, monthNum);
          let proratedServiceRate = currentRate.serviceRate;

          // Check if super admin was created in this month
          if (superAdmin.createdAt >= startOfMonth && superAdmin.createdAt <= endOfMonth) {
            const superAdminCreatedDay = superAdmin.createdAt.getDate();
            const remainingDays = totalDaysInMonth - superAdminCreatedDay + 1; // +1 to include creation day
            
            if (remainingDays < totalDaysInMonth) {
              isProrated = true;
              proratedDays = remainingDays;
              proratedServiceRate = Math.round((currentRate.serviceRate / totalDaysInMonth) * remainingDays);
            }
          }

          const userAmount = userCount * currentRate.perUserRate;
          const totalAmount = userAmount + proratedServiceRate;

          console.log(`💰 Payment calculation for ${superAdmin.name}: ${userCount} users × ₹${currentRate.perUserRate} = ₹${userAmount} + Service: ₹${proratedServiceRate} = Total: ₹${totalAmount}`);

          // Check if payment already exists for this super admin and month
          const existingPayment = await SuperSuperAdminPayment.findOne({
            superAdminId: superAdmin._id,
            month: month
          });

          if (existingPayment) {
            errors.push({
              superAdmin: superAdmin.name,
              reason: 'Payment already exists for this month'
            });
            continue;
          }

          // Create payment record
          const payment = new SuperSuperAdminPayment({
            superAdminId: superAdmin._id,
            superSuperAdminId: req.user._id,
            month: month,
            userCount: userCount,
            deletedUserCount: usersDeletedInThisMonth,
            perUserRate: currentRate.perUserRate,
            serviceRate: currentRate.serviceRate,
            isProrated: isProrated,
            proratedDays: proratedDays,
            totalDaysInMonth: totalDaysInMonth,
            proratedServiceRate: proratedServiceRate,
            userAmount: userAmount,
            totalAmount: totalAmount,
            dueDate: dueDate,
            createdBy: req.user._id
          });

          await payment.save();
          generatedPayments.push(payment);

        } catch (error) {
          errors.push({
            superAdmin: superAdmin.name,
            reason: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Generated ${generatedPayments.length} payments for ${month}`,
        data: {
          generated: generatedPayments.length,
          errors: errors
        }
      });

    } catch (error) {
      console.error('Error generating super admin payments:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while generating payments'
      });
    }
  }
);

// @desc    Get super admin payments (SuperSuperAdmin view)
// @route   GET /api/super-super-admin-payments
// @access  Private (SuperSuperAdmin)
router.get('/',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const { month, status, page = 1, limit = 20 } = req.query;

      let query = {};
      
      if (month) {
        query.month = month;
      }
      
      if (status) {
        query.status = status;
      }

      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 20;
      const skip = (pageNum - 1) * pageSize;

      const payments = await SuperSuperAdminPayment.find(query)
        .populate('superAdminId', 'name email isDeleted deletedAt')
        .populate('superSuperAdminId', 'name email')
        .populate('paymentProof')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .then(payments => payments.filter(payment => payment.superAdminId)); // Filter out payments where super admin is null

      // Recalculate payment amounts dynamically based on current user counts
      const recalculatedPayments = await Promise.all(payments.map(async (payment) => {
        // Skip payments where super admin has been deleted
        if (!payment.superAdminId) {
          console.log(`⚠️ Skipping payment ${payment._id} - super admin has been deleted`);
          return payment;
        }

        const [year, monthNum] = payment.month.split('-').map(Number);
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

        // Count ALL users for this specific month (all roles):
        // 1. Users who were active at the end of the month (created before/during month AND not deleted)
        // 2. PLUS users who were deleted within this month (regardless of when they were created)
        const activeUsersAtEndOfMonth = await User.countDocuments({
          createdAt: { $lte: endOfMonth }, // Created before or during the month
          isDeleted: false // Only count active users
        });

        const usersDeletedInThisMonth = await User.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: startOfMonth, $lte: endOfMonth } // Deleted within this month
        });

        const currentUserCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth; // Count active users + deleted users in this month
        const deletedUserCount = usersDeletedInThisMonth;

        // Get current rates
        const currentRate = await SuperSuperAdminPaymentRate.findOne({ isActive: true });
        
        if (currentRate) {
          // Recalculate amounts based on current user count
          const userAmount = currentUserCount * currentRate.perUserRate;
          
          // Calculate proration for service charge if super admin was created mid-month
          let isProrated = payment.isProrated;
          let proratedDays = payment.proratedDays;
          let totalDaysInMonth = payment.totalDaysInMonth;
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

          const totalAmount = userAmount + proratedServiceRate;

          // Update the payment object with recalculated values
          payment.userCount = currentUserCount;
          payment.deletedUserCount = deletedUserCount;
          payment.perUserRate = currentRate.perUserRate;
          payment.serviceRate = currentRate.serviceRate;
          payment.isProrated = isProrated;
          payment.proratedDays = proratedDays;
          payment.totalDaysInMonth = totalDaysInMonth;
          payment.proratedServiceRate = proratedServiceRate;
          payment.userAmount = userAmount;
          payment.totalAmount = totalAmount;
        }

        return payment;
      }));

      const total = await SuperSuperAdminPayment.countDocuments(query);

      res.json({
        success: true,
        data: recalculatedPayments,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / pageSize),
          total,
          hasNext: pageNum < Math.ceil(total / pageSize),
          hasPrev: pageNum > 1
        }
      });

    } catch (error) {
      console.error('Error fetching super admin payments:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching payments'
      });
    }
  }
);

// @desc    Get super admin's own payments (Super Admin view)
// @route   GET /api/super-super-admin-payments/my-payments
// @access  Private (SuperAdmin)
router.get('/my-payments',
  authenticateToken,
  authorizeRole('superAdmin'),
  async (req, res) => {
    try {
      const { month, status, page = 1, limit = 20 } = req.query;

      let query = { superAdminId: req.user._id };
      
      if (month) {
        query.month = month;
      }
      
      if (status) {
        query.status = status;
      }

      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 20;
      const skip = (pageNum - 1) * pageSize;

      const payments = await SuperSuperAdminPayment.find(query)
        .populate('superSuperAdminId', 'name email')
        .populate('paymentProof')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      // Recalculate payment amounts dynamically based on current user counts
      const recalculatedPayments = await Promise.all(payments.map(async (payment) => {
        const [year, monthNum] = payment.month.split('-').map(Number);
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

        // Count ALL users for this specific month (all roles):
        // 1. Users who were active at the end of the month (created before/during month AND not deleted)
        // 2. PLUS users who were deleted within this month (regardless of when they were created)
        const activeUsersAtEndOfMonth = await User.countDocuments({
          createdAt: { $lte: endOfMonth }, // Created before or during the month
          isDeleted: false // Only count active users
        });

        const usersDeletedInThisMonth = await User.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: startOfMonth, $lte: endOfMonth } // Deleted within this month
        });

        const currentUserCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth; // Count active users + deleted users in this month
        const deletedUserCount = usersDeletedInThisMonth;

        // Get current rates
        const currentRate = await SuperSuperAdminPaymentRate.findOne({ isActive: true });
        
        if (currentRate) {
          // Recalculate amounts based on current user count
          const userAmount = currentUserCount * currentRate.perUserRate;
          
          // Calculate proration for service charge if super admin was created mid-month
          let isProrated = payment.isProrated;
          let proratedDays = payment.proratedDays;
          let totalDaysInMonth = payment.totalDaysInMonth;
          let proratedServiceRate = currentRate.serviceRate;

          if (req.user.createdAt >= startOfMonth && req.user.createdAt <= endOfMonth) {
            const superAdminCreatedDay = req.user.createdAt.getDate();
            const remainingDays = totalDaysInMonth - superAdminCreatedDay + 1;
            
            if (remainingDays < totalDaysInMonth) {
              isProrated = true;
              proratedDays = remainingDays;
              proratedServiceRate = Math.round((currentRate.serviceRate / totalDaysInMonth) * remainingDays);
            }
          }

          const totalAmount = userAmount + proratedServiceRate;

          // Update the payment object with recalculated values
          payment.userCount = currentUserCount;
          payment.deletedUserCount = deletedUserCount;
          payment.perUserRate = currentRate.perUserRate;
          payment.serviceRate = currentRate.serviceRate;
          payment.isProrated = isProrated;
          payment.proratedDays = proratedDays;
          payment.totalDaysInMonth = totalDaysInMonth;
          payment.proratedServiceRate = proratedServiceRate;
          payment.userAmount = userAmount;
          payment.totalAmount = totalAmount;
        }

        return payment;
      }));

      const total = await SuperSuperAdminPayment.countDocuments(query);

      res.json({
        success: true,
        data: recalculatedPayments,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / pageSize),
          total,
          hasNext: pageNum < Math.ceil(total / pageSize),
          hasPrev: pageNum > 1
        }
      });

    } catch (error) {
      console.error('Error fetching super admin payments:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching payments'
      });
    }
  }
);

// @desc    Get SuperSuperAdmin QR code for super admin payments
// @route   GET /api/super-super-admin-payments/qr
// @access  Private (SuperAdmin)
router.get('/qr',
  authenticateToken,
  authorizeRole('superAdmin'),
  async (req, res) => {
    try {
      // Find SuperSuperAdmin's QR code (the one who created the payment)
      // First, find a payment for this super admin to get the super super admin ID
      const payment = await SuperSuperAdminPayment.findOne({ 
        superAdminId: req.user._id 
      }).populate('superSuperAdminId');
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'No payment records found. Please contact super super admin to generate payments first.'
        });
      }

      const qrCode = await PaymentQR.findOne({ 
        adminId: payment.superSuperAdminId._id, // SuperSuperAdmin's QR code
        isActive: true 
      }).sort({ createdAt: -1 });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: 'No QR code found for super super admin payments'
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
        message: 'Server error while fetching QR code'
      });
    }
  }
);

// @desc    Upload SuperSuperAdmin QR code for super admin payments
// @route   POST /api/super-super-admin-payments/super-super-admin/qr
// @access  Private (SuperSuperAdmin)
router.post('/super-super-admin/qr',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  superSuperAdminQrUpload.single('qrImage'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'QR code image is required'
        });
      }

      const { description } = req.body;

      // Create new QR code (don't deactivate existing ones automatically)
      const qrCode = new PaymentQR({
        adminId: req.user._id,
        qrImageUrl: `/uploads/super-super-admin-qr/${req.file.filename}`,
        qrImageName: req.file.originalname,
        description: description,
        isActive: false // Start as inactive, user can activate manually
      });

      await qrCode.save();

      res.status(201).json({
        success: true,
        message: 'SuperSuperAdmin QR code uploaded successfully',
        data: qrCode
      });

    } catch (error) {
      console.error('Error uploading SuperSuperAdmin QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while uploading QR code'
      });
    }
  }
);

// @desc    Get SuperSuperAdmin's own QR codes
// @route   GET /api/super-super-admin-payments/super-super-admin/qr
// @access  Private (SuperSuperAdmin)
router.get('/super-super-admin/qr',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const qrCodes = await PaymentQR.find({ 
        adminId: req.user._id
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: qrCodes
      });

    } catch (error) {
      console.error('Error fetching SuperSuperAdmin QR codes:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching QR codes'
      });
    }
  }
);

// @desc    Submit payment proof for super admin payment
// @route   POST /api/super-super-admin-payments/:paymentId/proof
// @access  Private (SuperAdmin)
router.post('/:paymentId/proof',
  authenticateToken,
  authorizeRole('superAdmin'),
  superAdminProofUpload.single('proofImage'),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { proofType, transactionNumber, paymentDate, amount, notes } = req.body;

      // Validate based on proof type
      if (proofType === 'screenshot' && !req.file) {
        return res.status(400).json({
          success: false,
          message: 'Payment proof image is required for screenshot submissions'
        });
      }
      
      if (proofType === 'transaction' && !transactionNumber?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Transaction number is required for transaction submissions'
        });
      }

      // Validate payment exists and belongs to this super admin
      const payment = await SuperSuperAdminPayment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      if (payment.superAdminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this payment'
        });
      }

      // Clean and validate proofType
      const cleanProofType = proofType === 'screenshot' ? 'screenshot' : 'transaction_number';
      
      // Create payment proof
      const proofData = {
        paymentId: paymentId,
        userId: req.user._id,
        adminId: payment.superSuperAdminId,
        proofType: cleanProofType,
        transactionNumber: cleanProofType === 'transaction_number' ? transactionNumber : undefined,
        paymentDate: paymentDate,
        amount: amount,
        notes: notes,
        status: 'pending'
      };
      
      // Add image fields only if screenshot type and file exists
      if (cleanProofType === 'screenshot' && req.file) {
        proofData.proofImageUrl = `/uploads/super-admin-payment-proofs/${req.file.filename}`;
        proofData.proofImageName = req.file.originalname;
      }
      
      const proof = new PaymentProof(proofData);

      await proof.save();

      // Update payment with proof reference
      payment.paymentProof = proof._id;
      await payment.save();

      res.status(201).json({
        success: true,
        message: 'Payment proof submitted successfully',
        data: proof
      });

    } catch (error) {
      console.error('Error submitting payment proof:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while submitting payment proof'
      });
    }
  }
);

// @desc    Get pending super admin payment proofs (SuperSuperAdmin only)
// @route   GET /api/super-super-admin-payments/pending-proofs
// @access  Private (SuperSuperAdmin)
router.get('/pending-proofs',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      console.log('🔍 SuperSuperAdmin pending proofs query:');
      console.log('   User ID:', req.user._id);
      console.log('   User Role:', req.user.role);
      console.log('   User Name:', req.user.name);

      const proofs = await PaymentProof.find({ 
        adminId: req.user._id,
        status: 'pending'
      })
        .populate({
          path: 'paymentId',
          model: 'SuperSuperAdminPayment',
          select: 'month totalAmount dueDate paymentPeriod'
        })
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
      console.error('Error fetching pending super admin payment proofs:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching pending proofs'
      });
    }
  }
);

// @desc    Approve/Reject payment proof (SuperSuperAdmin only)
// @route   PUT /api/super-super-admin-payments/proof/:proofId/review
// @access  Private (SuperSuperAdmin)
router.put('/proof/:proofId/review',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('adminNotes').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { proofId } = req.params;
      const { status, adminNotes } = req.body;

      const proof = await PaymentProof.findById(proofId);
      if (!proof) {
        return res.status(404).json({
          success: false,
          message: 'Payment proof not found'
        });
      }

      // Update proof status
      proof.status = status;
      proof.adminNotes = adminNotes;
      proof.reviewedBy = req.user._id;
      proof.reviewedAt = new Date();
      await proof.save();

      // Update payment status if approved
      if (status === 'approved') {
        const payment = await SuperSuperAdminPayment.findById(proof.paymentId);
        if (payment) {
          console.log(`🔄 Updating payment status for payment ${payment._id}:`);
          console.log(`   Old status: ${payment.status}`);
          console.log(`   New status: paid`);
          console.log(`   Payment date: ${new Date()}`);
          
          payment.status = 'paid';
          payment.paymentDate = new Date();
          await payment.save();
          
          console.log(`   ✅ Payment status updated successfully`);
        } else {
          console.log(`❌ Payment not found for proof ${proofId}`);
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
        message: 'Server error while reviewing payment proof'
      });
    }
  }
);

// @desc    Toggle SuperSuperAdmin QR code active status
// @route   PUT /api/super-super-admin-payments/super-super-admin/qr/:qrId/toggle-active
// @access  Private (SuperSuperAdmin)
router.put('/super-super-admin/qr/:qrId/toggle-active',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const { qrId } = req.params;
      
      const qrCode = await PaymentQR.findById(qrId);
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: 'QR code not found'
        });
      }
      
      // Check if SuperSuperAdmin owns this QR code
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
      console.error('Error toggling SuperSuperAdmin QR code status:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while toggling QR code status'
      });
    }
  }
);

// @desc    Delete SuperSuperAdmin QR code
// @route   DELETE /api/super-super-admin-payments/super-super-admin/qr/:qrId
// @access  Private (SuperSuperAdmin)
router.delete('/super-super-admin/qr/:qrId',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const { qrId } = req.params;
      
      const qrCode = await PaymentQR.findById(qrId);
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: 'QR code not found'
        });
      }
      
      // Check if SuperSuperAdmin owns this QR code
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
      console.error('Error deleting SuperSuperAdmin QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting QR code'
      });
    }
  }
);

module.exports = router;
