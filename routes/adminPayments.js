const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const AdminPaymentRate = require('../models/AdminPaymentRate');
const AdminPayment = require('../models/AdminPayment');
const PaymentQR = require('../models/PaymentQR');
const PaymentProof = require('../models/PaymentProof');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Configure multer for QR code uploads
const qrStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'admin-payment-qr');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'admin-qr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for Super Admin QR code uploads
const superAdminQrStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'super-admin-qr');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'super-admin-qr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for admin payment proof uploads
const adminProofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'admin-payment-proofs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'admin-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const qrUpload = multer({
  storage: qrStorage,
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

const superAdminQrUpload = multer({
  storage: superAdminQrStorage,
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

const adminProofUpload = multer({
  storage: adminProofStorage,
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

// @desc    Get current payment rates (Super Admin only)
// @route   GET /api/admin-payments/rates
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.get('/rates', 
  authenticateToken, 
  authorizeRole('superAdmin', 'superSuperAdmin'),
  async (req, res) => {
    try {
      const currentRate = await AdminPaymentRate.findOne({ isActive: true });
      
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

// @desc    Set/Update payment rates (Super Admin only)
// @route   POST /api/admin-payments/rates
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.post('/rates',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
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
      await AdminPaymentRate.updateMany(
        { isActive: true },
        { isActive: false }
      );

      // Create new rate
      const newRate = new AdminPaymentRate({
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

// @desc    Generate admin payments for current month (Super Admin only)
// @route   POST /api/admin-payments/generate
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.post('/generate',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
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

      // For production: Restrict to current or past months only
      // For testing: Allow future months
      const currentMonth = getCurrentMonth();
      const [currentYear, currentMonthNum] = currentMonth.split('-').map(Number);
      const [requestedYear, requestedMonthNum] = month.split('-').map(Number);
      
      // Uncomment the following lines to restrict to current/past months in production:
      /*
      if (requestedYear > currentYear || (requestedYear === currentYear && requestedMonthNum > currentMonthNum)) {
        return res.status(400).json({
          success: false,
          message: 'Payment generation is only allowed for current or past months'
        });
      }
      */

      // Get current rates
      const currentRate = await AdminPaymentRate.findOne({ isActive: true });
      if (!currentRate) {
        return res.status(400).json({
          success: false,
          message: 'No active payment rates found. Please set rates first.'
        });
      }

      // Get all admins
      const admins = await User.find({ role: 'admin', isActive: true });
      
      const [year, monthNum] = month.split('-').map(Number);
      const dueDate = calculateDueDate(year, monthNum);
      
      const generatedPayments = [];
      const errors = [];

      for (const admin of admins) {
        try {
          // Define month boundaries for the specified month
          const startOfMonth = new Date(year, monthNum - 1, 1);
          const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

          // Count users for this specific month:
          // 1. Users who were active at the end of the month (created before/during month AND not deleted by end of month)
          // 2. PLUS users who were deleted within this month (regardless of when they were created)
          const activeUsersAtEndOfMonth = await User.countDocuments({
            adminId: admin._id,
            role: { $in: ['fieldAgent', 'auditor'] },
            createdAt: { $lte: endOfMonth }, // Created before or during the month
            $or: [
              { isDeleted: false },
              { isDeleted: true, deletedAt: { $gt: endOfMonth } } // Deleted after this month
            ]
          });

          const usersDeletedInThisMonth = await User.countDocuments({
            adminId: admin._id,
            role: { $in: ['fieldAgent', 'auditor'] },
            isDeleted: true,
            deletedAt: { $gte: startOfMonth, $lte: endOfMonth } // Deleted within this month
          });

          const userCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth;

          console.log(`📊 Admin ${admin.name} (${admin._id}) has ${userCount} users active during ${month}`);

          // Calculate proration for service charge if admin was created mid-month
          let isProrated = false;
          let proratedDays = 0;
          let totalDaysInMonth = getLastDayOfMonth(year, monthNum);
          let proratedServiceRate = currentRate.serviceRate;

          // Check if admin was created in this month
          if (admin.createdAt >= startOfMonth && admin.createdAt <= endOfMonth) {
            const adminCreatedDay = admin.createdAt.getDate();
            const remainingDays = totalDaysInMonth - adminCreatedDay + 1; // +1 to include creation day
            
            if (remainingDays < totalDaysInMonth) {
              isProrated = true;
              proratedDays = remainingDays;
              proratedServiceRate = Math.round((currentRate.serviceRate / totalDaysInMonth) * remainingDays);
            }
          }

          const userAmount = userCount * currentRate.perUserRate;
          const totalAmount = userAmount + proratedServiceRate;

          console.log(`💰 Payment calculation for ${admin.name}: ${userCount} users × ₹${currentRate.perUserRate} = ₹${userAmount} + Service: ₹${proratedServiceRate} = Total: ₹${totalAmount}`);

          // Check if payment already exists for this admin and month
          const existingPayment = await AdminPayment.findOne({
            adminId: admin._id,
            month: month
          });

          if (existingPayment) {
            errors.push({
              admin: admin.name,
              reason: 'Payment already exists for this month'
            });
            continue;
          }

          // Create payment record
          const payment = new AdminPayment({
            adminId: admin._id,
            superAdminId: req.user._id,
            month: month,
            userCount: userCount,
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
            admin: admin.name,
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
      console.error('Error generating admin payments:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while generating payments'
      });
    }
  }
);

// @desc    Get admin payments (Super Admin view)
// @route   GET /api/admin-payments
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.get('/',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
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

      const payments = await AdminPayment.find(query)
        .populate('adminId', 'name email isDeleted deletedAt createdAt')
        .populate('superAdminId', 'name email')
        .populate('paymentProof')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .then(payments => payments.filter(payment => payment.adminId)); // Filter out payments where admin is null

      // Recalculate payment amounts dynamically based on current user counts
      const recalculatedPayments = await Promise.all(payments.map(async (payment) => {
        // Skip payments where admin has been deleted
        if (!payment.adminId) {
          console.log(`⚠️ Skipping payment ${payment._id} - admin has been deleted`);
          return payment;
        }

        const [year, monthNum] = payment.month.split('-').map(Number);
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

        // Count users for this specific month:
        // 1. Users who were active at the end of the month (created before/during month AND not deleted by end of month)
        // 2. PLUS users who were deleted within this month (regardless of when they were created)
        const activeUsersAtEndOfMonth = await User.countDocuments({
          adminId: payment.adminId._id,
          role: { $in: ['fieldAgent', 'auditor'] },
          createdAt: { $lte: endOfMonth }, // Created before or during the month
          $or: [
            { isDeleted: false },
            { isDeleted: true, deletedAt: { $gt: endOfMonth } } // Deleted after this month
          ]
        });

        const usersDeletedInThisMonth = await User.countDocuments({
          adminId: payment.adminId._id,
          role: { $in: ['fieldAgent', 'auditor'] },
          isDeleted: true,
          deletedAt: { $gte: startOfMonth, $lte: endOfMonth } // Deleted within this month
        });

        const currentUserCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth;
        const deletedUserCount = usersDeletedInThisMonth;

        // Get current rates
        const currentRate = await AdminPaymentRate.findOne({ isActive: true });
        
        if (currentRate) {
          // Recalculate amounts based on current user count
          const userAmount = currentUserCount * currentRate.perUserRate;
          
          // Calculate proration for service charge if admin was created mid-month
          let isProrated = payment.isProrated;
          let proratedDays = payment.proratedDays;
          let totalDaysInMonth = getLastDayOfMonth(year, monthNum);
          let proratedServiceRate = currentRate.serviceRate;

          if (payment.adminId && payment.adminId.createdAt >= startOfMonth && payment.adminId.createdAt <= endOfMonth) {
            const adminCreatedDay = payment.adminId.createdAt.getDate();
            const remainingDays = totalDaysInMonth - adminCreatedDay + 1;
            
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

      const total = await AdminPayment.countDocuments(query);

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
      console.error('Error fetching admin payments:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching payments'
      });
    }
  }
);

// @desc    Get admin's own payments (Admin view)
// @route   GET /api/admin-payments/my-payments
// @access  Private (Admin)
router.get('/my-payments',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const { month, status, page = 1, limit = 20 } = req.query;

      let query = { adminId: req.user._id };
      
      if (month) {
        query.month = month;
      }
      
      if (status) {
        query.status = status;
      }

      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 20;
      const skip = (pageNum - 1) * pageSize;

      const payments = await AdminPayment.find(query)
        .populate('superAdminId', 'name email')
        .populate('paymentProof')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      // Recalculate payment amounts dynamically based on current user counts
      const recalculatedPayments = await Promise.all(payments.map(async (payment) => {
        const [year, monthNum] = payment.month.split('-').map(Number);
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

        // Count users for this specific month:
        // 1. Users who were active at the end of the month (created before/during month AND not deleted by end of month)
        // 2. PLUS users who were deleted within this month (regardless of when they were created)
        const activeUsersAtEndOfMonth = await User.countDocuments({
          adminId: req.user._id,
          role: { $in: ['fieldAgent', 'auditor'] },
          createdAt: { $lte: endOfMonth }, // Created before or during the month
          $or: [
            { isDeleted: false },
            { isDeleted: true, deletedAt: { $gt: endOfMonth } } // Deleted after this month
          ]
        });

        const usersDeletedInThisMonth = await User.countDocuments({
          adminId: req.user._id,
          role: { $in: ['fieldAgent', 'auditor'] },
          isDeleted: true,
          deletedAt: { $gte: startOfMonth, $lte: endOfMonth } // Deleted within this month
        });

        const currentUserCount = activeUsersAtEndOfMonth + usersDeletedInThisMonth;
        const deletedUserCount = usersDeletedInThisMonth;

        // Get current rates
        const currentRate = await AdminPaymentRate.findOne({ isActive: true });
        
        if (currentRate) {
          // Recalculate amounts based on current user count
          const userAmount = currentUserCount * currentRate.perUserRate;
          
          // Calculate proration for service charge if admin was created mid-month
          let isProrated = payment.isProrated;
          let proratedDays = payment.proratedDays;
          let totalDaysInMonth = getLastDayOfMonth(year, monthNum);
          let proratedServiceRate = currentRate.serviceRate;

          if (req.user.createdAt >= startOfMonth && req.user.createdAt <= endOfMonth) {
            const adminCreatedDay = req.user.createdAt.getDate();
            const remainingDays = totalDaysInMonth - adminCreatedDay + 1;
            
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

      const total = await AdminPayment.countDocuments(query);

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
      console.error('Error fetching admin payments:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching payments'
      });
    }
  }
);

// @desc    Get Super Admin QR code for admin payments
// @route   GET /api/admin-payments/qr
// @access  Private (Admin)
router.get('/qr',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      // Find Super Admin's QR code (the one who created the payment)
      // First, find a payment for this admin to get the super admin ID
      const payment = await AdminPayment.findOne({ 
        adminId: req.user._id 
      }).populate('superAdminId');
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'No payment records found. Please contact super admin to generate payments first.'
        });
      }

      const qrCode = await PaymentQR.findOne({ 
        adminId: payment.superAdminId._id, // Super Admin's QR code
        isActive: true 
      }).sort({ createdAt: -1 });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: 'No QR code found for super admin payments'
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

// @desc    Upload Super Admin QR code for admin payments
// @route   POST /api/admin-payments/super-admin/qr
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.post('/super-admin/qr',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
  superAdminQrUpload.single('qrImage'),
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
        qrImageUrl: `/uploads/super-admin-qr/${req.file.filename}`,
        qrImageName: req.file.originalname,
        description: description,
        isActive: false // Start as inactive, user can activate manually
      });

      await qrCode.save();

      res.status(201).json({
        success: true,
        message: 'Super Admin QR code uploaded successfully',
        data: qrCode
      });

    } catch (error) {
      console.error('Error uploading Super Admin QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while uploading QR code'
      });
    }
  }
);

// @desc    Get Super Admin's own QR codes
// @route   GET /api/admin-payments/super-admin/qr
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.get('/super-admin/qr',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
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
      console.error('Error fetching Super Admin QR codes:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching QR codes'
      });
    }
  }
);

// @desc    Submit payment proof for admin payment
// @route   POST /api/admin-payments/:paymentId/proof
// @access  Private (Admin)
router.post('/:paymentId/proof',
  authenticateToken,
  authorizeRole('admin'),
  adminProofUpload.single('proofImage'),
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

      // Validate payment exists and belongs to this admin
      const payment = await AdminPayment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      if (payment.adminId.toString() !== req.user._id.toString()) {
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
        adminId: payment.superAdminId,
        proofType: cleanProofType,
        transactionNumber: cleanProofType === 'transaction_number' ? transactionNumber : undefined,
        paymentDate: paymentDate,
        amount: amount,
        notes: notes,
        status: 'pending'
      };
      
      // Add image fields only if screenshot type and file exists
      if (cleanProofType === 'screenshot' && req.file) {
        proofData.proofImageUrl = `/uploads/admin-payment-proofs/${req.file.filename}`;
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

// @desc    Get pending admin payment proofs (Super Admin only)
// @route   GET /api/admin-payments/pending-proofs
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.get('/pending-proofs',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      console.log('🔍 Super Admin pending proofs query:');
      console.log('   User ID:', req.user._id);
      console.log('   User Role:', req.user.role);
      console.log('   User Name:', req.user.name);

      const proofs = await PaymentProof.find({ 
        adminId: req.user._id,
        status: 'pending'
      })
        .populate({
          path: 'paymentId',
          model: 'AdminPayment',
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
      console.error('Error fetching pending admin payment proofs:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching pending proofs'
      });
    }
  }
);

// @desc    Approve/Reject payment proof (Super Admin only)
// @route   PUT /api/admin-payments/proof/:proofId/review
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.put('/proof/:proofId/review',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
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
        const payment = await AdminPayment.findById(proof.paymentId);
        if (payment) {
          payment.status = 'paid';
          payment.paymentDate = new Date();
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
        message: 'Server error while reviewing payment proof'
      });
    }
  }
);

// @desc    Toggle Super Admin QR code active status
// @route   PUT /api/admin-payments/super-admin/qr/:qrId/toggle-active
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.put('/super-admin/qr/:qrId/toggle-active',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
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
      
      // Check if Super Admin owns this QR code
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
      console.error('Error toggling Super Admin QR code status:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while toggling QR code status'
      });
    }
  }
);

// @desc    Delete Super Admin QR code
// @route   DELETE /api/admin-payments/super-admin/qr/:qrId
// @access  Private (SuperAdmin, SuperSuperAdmin)
router.delete('/super-admin/qr/:qrId',
  authenticateToken,
  authorizeRole('superAdmin', 'superSuperAdmin'),
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
      
      // Check if Super Admin owns this QR code
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
      console.error('Error deleting Super Admin QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting QR code'
      });
    }
  }
);

module.exports = router;
