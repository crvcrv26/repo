const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// @desc    Get payment rates for admin (what they charge to auditors and field agents)
// @route   GET /api/payments/rates
// @access  Private (Admin)
router.get('/rates',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      // Get current rates from admin's profile or settings
      // For now, we'll use a simple approach - you can extend this later
      const admin = await User.findById(req.user._id).select('paymentRates');
      
      res.json({
        success: true,
        data: {
          auditorRate: admin.paymentRates?.auditorRate || 0,
          fieldAgentRate: admin.paymentRates?.fieldAgentRate || 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Update payment rates for admin
// @route   PUT /api/payments/rates
// @access  Private (Admin)
router.put('/rates',
  authenticateToken,
  authorizeRole('admin'),
  [
    body('auditorRate').isNumeric().withMessage('Auditor rate must be a number'),
    body('fieldAgentRate').isNumeric().withMessage('Field agent rate must be a number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { auditorRate, fieldAgentRate } = req.body;

      // Update admin's payment rates
      await User.findByIdAndUpdate(req.user._id, {
        paymentRates: {
          auditorRate: parseFloat(auditorRate),
          fieldAgentRate: parseFloat(fieldAgentRate)
        }
      });

      res.json({
        success: true,
        message: 'Payment rates updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Get admin's payment summary (total expected payments)
// @route   GET /api/payments/admin-summary
// @access  Private (Admin)
router.get('/admin-summary',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const { month, year } = req.query;
      const currentDate = new Date();
      const currentMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const currentYear = year ? parseInt(year) : currentDate.getFullYear();

      // Get all payments for this admin
      const payments = await Payment.aggregate([
        {
          $match: {
            adminId: req.user._id,
            paymentMonth: currentMonth,
            paymentYear: currentYear
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  role: 1,
                  isActive: 1
                }
              }
            ]
          }
        },
        {
          $unwind: '$user'
        },
        {
          $group: {
            _id: '$userRole',
            totalAmount: { $sum: '$monthlyAmount' },
            paidAmount: { $sum: '$paidAmount' },
            pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$monthlyAmount', 0] } },
            overdueAmount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$monthlyAmount', 0] } },
            count: { $sum: 1 },
            paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
          }
        }
      ]);

      // Get user counts for the specific month (including deleted users)
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      
      const auditorCount = await User.countDocuments({
        role: 'auditor',
        createdBy: req.user._id,
        $or: [
          // Active users (created before or during this month)
          { 
            isActive: true,
            createdAt: { $lte: endOfMonth }
          },
          // Deleted users who were deleted during this month (regardless of when they were created)
          {
            isDeleted: true,
            deletedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        ]
      });

      const fieldAgentCount = await User.countDocuments({
        role: 'fieldAgent',
        createdBy: req.user._id,
        $or: [
          // Active users (created before or during this month)
          { 
            isActive: true,
            createdAt: { $lte: endOfMonth }
          },
          // Deleted users who were deleted during this month (regardless of when they were created)
          {
            isDeleted: true,
            deletedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        ]
      });

      // Get admin's rates
      const admin = await User.findById(req.user._id).select('paymentRates');
      const auditorRate = admin.paymentRates?.auditorRate || 0;
      const fieldAgentRate = admin.paymentRates?.fieldAgentRate || 0;

      // Calculate expected amounts
      const expectedAuditorAmount = auditorCount * auditorRate;
      const expectedFieldAgentAmount = fieldAgentCount * fieldAgentRate;

      // Format response
      const summary = {
        month: currentMonth,
        year: currentYear,
        period: `${getMonthName(currentMonth)} ${currentYear}`,
        rates: {
          auditorRate,
          fieldAgentRate
        },
        userCounts: {
          auditors: auditorCount,
          fieldAgents: fieldAgentCount
        },
        expectedAmounts: {
          auditors: expectedAuditorAmount,
          fieldAgents: expectedFieldAgentAmount,
          total: expectedAuditorAmount + expectedFieldAgentAmount
        },
        actualPayments: {
          auditors: payments.find(p => p._id === 'auditor') || {
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            count: 0,
            paidCount: 0,
            pendingCount: 0,
            overdueCount: 0
          },
          fieldAgents: payments.find(p => p._id === 'fieldAgent') || {
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            count: 0,
            paidCount: 0,
            pendingCount: 0,
            overdueCount: 0
          }
        }
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Get admin's detailed payment list
// @route   GET /api/payments/admin-details
// @access  Private (Admin)
router.get('/admin-details',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const { month, year, status, role, page = 1, limit = 20 } = req.query;
      const currentDate = new Date();
      
      // Build match conditions
      const matchConditions = {
        adminId: req.user._id,
      };
      
      // Only add month/year filters if month is not 'all'
      if (month && month !== 'all') {
        const currentMonth = parseInt(month);
        const currentYear = year ? parseInt(year) : currentDate.getFullYear();
        matchConditions.paymentMonth = currentMonth;
        matchConditions.paymentYear = currentYear;
      }

      // Only filter by isActive if it's explicitly set to false
      // This allows us to see all payments including active ones
      if (status) matchConditions.status = status;
      if (role) matchConditions.userRole = role;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get payments with user details
      const payments = await Payment.aggregate([
        {
          $match: matchConditions
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phone: 1,
                  role: 1,
                  isActive: 1,
                  isDeleted: 1,
                  createdAt: 1
                }
              }
            ]
          }
        },
        {
          $unwind: '$user'
        },
        {
          $addFields: {
            'user.displayName': {
              $cond: {
                if: '$user.isDeleted',
                then: { $concat: ['$user.name', ' (Deleted)'] },
                else: '$user.name'
              }
            }
          }
        },
        {
          $addFields: {
            amount: '$monthlyAmount'
          }
        },
        {
          $addFields: {
            paymentPeriod: {
              $cond: {
                if: { $and: [{ $ne: ['$periodStart', null] }, { $ne: ['$periodEnd', null] }] },
                then: {
                  $concat: [
                    { $toString: { $dayOfMonth: '$periodStart' } },
                    ' ',
                    { $switch: {
                      branches: [
                        { case: { $eq: [{ $month: '$periodStart' }, 1] }, then: 'Jan' },
                        { case: { $eq: [{ $month: '$periodStart' }, 2] }, then: 'Feb' },
                        { case: { $eq: [{ $month: '$periodStart' }, 3] }, then: 'Mar' },
                        { case: { $eq: [{ $month: '$periodStart' }, 4] }, then: 'Apr' },
                        { case: { $eq: [{ $month: '$periodStart' }, 5] }, then: 'May' },
                        { case: { $eq: [{ $month: '$periodStart' }, 6] }, then: 'Jun' },
                        { case: { $eq: [{ $month: '$periodStart' }, 7] }, then: 'Jul' },
                        { case: { $eq: [{ $month: '$periodStart' }, 8] }, then: 'Aug' },
                        { case: { $eq: [{ $month: '$periodStart' }, 9] }, then: 'Sep' },
                        { case: { $eq: [{ $month: '$periodStart' }, 10] }, then: 'Oct' },
                        { case: { $eq: [{ $month: '$periodStart' }, 11] }, then: 'Nov' },
                        { case: { $eq: [{ $month: '$periodStart' }, 12] }, then: 'Dec' }
                      ],
                      default: 'Unknown'
                    }},
                    ' - ',
                    { $toString: { $dayOfMonth: '$periodEnd' } },
                    ' ',
                    { $switch: {
                      branches: [
                        { case: { $eq: [{ $month: '$periodEnd' }, 1] }, then: 'Jan' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 2] }, then: 'Feb' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 3] }, then: 'Mar' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 4] }, then: 'Apr' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 5] }, then: 'May' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 6] }, then: 'Jun' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 7] }, then: 'Jul' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 8] }, then: 'Aug' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 9] }, then: 'Sep' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 10] }, then: 'Oct' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 11] }, then: 'Nov' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 12] }, then: 'Dec' }
                      ],
                      default: 'Unknown'
                    }}
                  ]
                },
                else: {
                  $concat: [
                    { $switch: {
                      branches: [
                        { case: { $eq: ['$paymentMonth', 1] }, then: 'Jan' },
                        { case: { $eq: ['$paymentMonth', 2] }, then: 'Feb' },
                        { case: { $eq: ['$paymentMonth', 3] }, then: 'Mar' },
                        { case: { $eq: ['$paymentMonth', 4] }, then: 'Apr' },
                        { case: { $eq: ['$paymentMonth', 5] }, then: 'May' },
                        { case: { $eq: ['$paymentMonth', 6] }, then: 'Jun' },
                        { case: { $eq: ['$paymentMonth', 7] }, then: 'Jul' },
                        { case: { $eq: ['$paymentMonth', 8] }, then: 'Aug' },
                        { case: { $eq: ['$paymentMonth', 9] }, then: 'Sep' },
                        { case: { $eq: ['$paymentMonth', 10] }, then: 'Oct' },
                        { case: { $eq: ['$paymentMonth', 11] }, then: 'Nov' },
                        { case: { $eq: ['$paymentMonth', 12] }, then: 'Dec' }
                      ],
                      default: 'Unknown'
                    }},
                    ' ',
                    { $toString: '$paymentYear' }
                  ]
                }
              }
            }
          }
        },
        {
          $sort: { dueDate: 1 }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: skip },
              { $limit: parseInt(limit) }
            ]
          }
        }
      ]);

      const total = payments[0].metadata[0]?.total || 0;
      const data = payments[0].data;

      console.log('🔍 Backend - Admin Details Response:');
      console.log('   Total:', total);
      console.log('   Data length:', data.length);
      console.log('   Sample data:', data.slice(0, 2));

      res.json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Get user's payment dues (for auditor and field agent)
// @route   GET /api/payments/user-dues
// @access  Private (Auditor, FieldAgent)
router.get('/user-dues',
  authenticateToken,
  authorizeRole('auditor', 'fieldAgent'),
  async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      // Build match conditions
      const matchConditions = {
        userId: req.user._id,
        isActive: true
      };

      if (status) matchConditions.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get user's payments
      const payments = await Payment.aggregate([
        {
          $match: matchConditions
        },
        {
          $lookup: {
            from: 'users',
            localField: 'adminId',
            foreignField: '_id',
            as: 'admin',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phone: 1,
                  isDeleted: 1
                }
              }
            ]
          }
        },
        {
          $unwind: '$admin'
        },
        {
          $addFields: {
            'admin.displayName': {
              $cond: {
                if: '$admin.isDeleted',
                then: { $concat: ['$admin.name', ' (Deleted)'] },
                else: '$admin.name'
              }
            }
          }
        },
        {
          $lookup: {
            from: 'paymentproofs',
            localField: '_id',
            foreignField: 'paymentId',
            as: 'proof'
          }
        },
        {
          $addFields: {
            hasProof: { $gt: [{ $size: '$proof' }, 0] },
            proofStatus: {
              $cond: {
                if: { $gt: [{ $size: '$proof' }, 0] },
                then: { $arrayElemAt: ['$proof.status', 0] },
                else: null
              }
            }
          }
        },
        {
          $addFields: {
            paymentPeriod: {
              $cond: {
                if: { $and: [{ $ne: ['$periodStart', null] }, { $ne: ['$periodEnd', null] }] },
                then: {
                  $concat: [
                    { $toString: { $dayOfMonth: '$periodStart' } },
                    ' ',
                    { $switch: {
                      branches: [
                        { case: { $eq: [{ $month: '$periodStart' }, 1] }, then: 'Jan' },
                        { case: { $eq: [{ $month: '$periodStart' }, 2] }, then: 'Feb' },
                        { case: { $eq: [{ $month: '$periodStart' }, 3] }, then: 'Mar' },
                        { case: { $eq: [{ $month: '$periodStart' }, 4] }, then: 'Apr' },
                        { case: { $eq: [{ $month: '$periodStart' }, 5] }, then: 'May' },
                        { case: { $eq: [{ $month: '$periodStart' }, 6] }, then: 'Jun' },
                        { case: { $eq: [{ $month: '$periodStart' }, 7] }, then: 'Jul' },
                        { case: { $eq: [{ $month: '$periodStart' }, 8] }, then: 'Aug' },
                        { case: { $eq: [{ $month: '$periodStart' }, 9] }, then: 'Sep' },
                        { case: { $eq: [{ $month: '$periodStart' }, 10] }, then: 'Oct' },
                        { case: { $eq: [{ $month: '$periodStart' }, 11] }, then: 'Nov' },
                        { case: { $eq: [{ $month: '$periodStart' }, 12] }, then: 'Dec' }
                      ],
                      default: 'Unknown'
                    }},
                    ' - ',
                    { $toString: { $dayOfMonth: '$periodEnd' } },
                    ' ',
                    { $switch: {
                      branches: [
                        { case: { $eq: [{ $month: '$periodEnd' }, 1] }, then: 'Jan' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 2] }, then: 'Feb' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 3] }, then: 'Mar' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 4] }, then: 'Apr' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 5] }, then: 'May' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 6] }, then: 'Jun' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 7] }, then: 'Jul' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 8] }, then: 'Aug' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 9] }, then: 'Sep' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 10] }, then: 'Oct' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 11] }, then: 'Nov' },
                        { case: { $eq: [{ $month: '$periodEnd' }, 12] }, then: 'Dec' }
                      ],
                      default: 'Unknown'
                    }}
                  ]
                },
                else: {
                  $concat: [
                    { $switch: {
                      branches: [
                        { case: { $eq: ['$paymentMonth', 1] }, then: 'Jan' },
                        { case: { $eq: ['$paymentMonth', 2] }, then: 'Feb' },
                        { case: { $eq: ['$paymentMonth', 3] }, then: 'Mar' },
                        { case: { $eq: ['$paymentMonth', 4] }, then: 'Apr' },
                        { case: { $eq: ['$paymentMonth', 5] }, then: 'May' },
                        { case: { $eq: ['$paymentMonth', 6] }, then: 'Jun' },
                        { case: { $eq: ['$paymentMonth', 7] }, then: 'Jul' },
                        { case: { $eq: ['$paymentMonth', 8] }, then: 'Aug' },
                        { case: { $eq: ['$paymentMonth', 9] }, then: 'Sep' },
                        { case: { $eq: ['$paymentMonth', 10] }, then: 'Oct' },
                        { case: { $eq: ['$paymentMonth', 11] }, then: 'Nov' },
                        { case: { $eq: ['$paymentMonth', 12] }, then: 'Dec' }
                      ],
                      default: 'Unknown'
                    }},
                    ' ',
                    { $toString: '$paymentYear' }
                  ]
                }
              }
            }
          }
        },
        {
          $sort: { dueDate: -1 }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: skip },
              { $limit: parseInt(limit) }
            ]
          }
        }
      ]);

      const total = payments[0].metadata[0]?.total || 0;
      const data = payments[0].data;

      // Calculate summary
      const summary = await Payment.aggregate([
        {
          $match: { userId: req.user._id, isActive: true }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$monthlyAmount' }
          }
        }
      ]);

      const summaryData = {
        pending: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 }
      };

      summary.forEach(item => {
        summaryData[item._id] = {
          count: item.count,
          amount: item.totalAmount
        };
      });

      res.json({
        success: true,
        data,
        summary: summaryData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Mark payment as paid
// @route   PUT /api/payments/:id/mark-paid
// @access  Private (Admin)
router.put('/:id/mark-paid',
  authenticateToken,
  authorizeRole('admin'),
  [
    body('paidAmount').isNumeric().withMessage('Paid amount must be a number'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Check if admin owns this payment
      if (payment.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const { paidAmount, notes } = req.body;

      payment.status = 'paid';
      payment.paidAmount = parseFloat(paidAmount);
      payment.paidDate = new Date();
      if (notes) payment.notes = notes;

      await payment.save();

      res.json({
        success: true,
        message: 'Payment marked as paid successfully',
        data: payment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Generate monthly payments for all users
// @route   POST /api/payments/generate-monthly
// @access  Private (Admin)
router.post('/generate-monthly',
  authenticateToken,
  authorizeRole('admin'),
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').isInt({ min: 2020 }).withMessage('Year must be valid')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { month, year } = req.body;

      // Get admin's rates
      const admin = await User.findById(req.user._id).select('paymentRates');
      const auditorRate = admin.paymentRates?.auditorRate || 0;
      const fieldAgentRate = admin.paymentRates?.fieldAgentRate || 0;

      // Get all auditors and field agents created by this admin that should be billed for this month
      // This includes:
      // 1. Users created before or during this month who are still active
      // 2. Users created before or during this month who were deleted during this month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      
      const users = await User.find({
        role: { $in: ['auditor', 'fieldAgent'] },
        createdBy: req.user._id,
        $or: [
          // Active users (created before or during this month)
          { 
            isActive: true,
            createdAt: { $lte: endOfMonth }
          },
          // Deleted users who were deleted during this month (regardless of when they were created)
          {
            isDeleted: true,
            deletedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        ]
      }).select('_id role createdAt isDeleted deletedAt');

      const payments = [];
      const generationErrors = [];

      for (const user of users) {
        try {
          // Calculate due date based on monthly anniversary billing cycle
          const userCreatedAt = new Date(user.createdAt);
          const userCreatedDay = userCreatedAt.getDate();
          const userCreatedMonth = userCreatedAt.getMonth() + 1;
          const userCreatedYear = userCreatedAt.getFullYear();
          
                     // Calculate period dates
           const periodStart = calculatePeriodStart(userCreatedAt, month, year);
           // Store periodEnd as end of day in UTC to avoid timezone issues
           const periodEnd = new Date(Date.UTC(year, month - 1, new Date(year, month, 0).getDate(), 23, 59, 59, 999));
           const dueDate = new Date(Date.UTC(year, month - 1, new Date(year, month, 0).getDate(), 23, 59, 59, 999));

           // Determine monthly amount based on role and proration
           const fullAmount = user.role === 'auditor' ? auditorRate : fieldAgentRate;
           const monthlyAmount = calculateProratedAmount(fullAmount, userCreatedAt, month, year);

           // Check if payment already exists
           const existingPayment = await Payment.findOne({
             adminId: req.user._id,
             userId: user._id,
             paymentMonth: month,
             paymentYear: year
           });

           if (existingPayment) {
             generationErrors.push(`Payment already exists for ${user.role} in ${getMonthName(month)} ${year}`);
             continue;
           }

           // Create payment record
           const payment = new Payment({
             adminId: req.user._id,
             userId: user._id,
             userRole: user.role,
             monthlyAmount,
             paymentMonth: month,
             paymentYear: year,
             periodStart,
             periodEnd,
             dueDate,
             userCreatedAt: user.createdAt,
             wasDeleted: user.isDeleted || false,
             userDeletedAt: user.deletedAt || null,
             status: 'pending'
           });

          payments.push(payment);
        } catch (error) {
          generationErrors.push(`Error creating payment for user ${user._id}: ${error.message}`);
        }
      }

      // Save all payments
      if (payments.length > 0) {
        await Payment.insertMany(payments);
      }

      res.json({
        success: true,
        message: `Generated ${payments.length} payment records for ${getMonthName(month)} ${year}`,
        data: {
          created: payments.length,
          errors: generationErrors.length > 0 ? generationErrors : undefined
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// Helper function to get month name
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

// Helper function to calculate period start date
function calculatePeriodStart(creationDate, targetMonth, targetYear) {
  const creationMonth = creationDate.getMonth() + 1;
  const creationYear = creationDate.getFullYear();
  
  // If this is the creation month, start from creation date
  if (targetMonth === creationMonth && targetYear === creationYear) {
    // Store as start of day in UTC to avoid timezone issues
    const creationDay = creationDate.getDate();
    const creationMonthZero = creationDate.getMonth();
    const creationYearFull = creationDate.getFullYear();
    return new Date(Date.UTC(creationYearFull, creationMonthZero, creationDay, 0, 0, 0, 0));
  }
  
  // For subsequent months, start from 1st of the month in UTC
  return new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
}

// Helper function to calculate prorated amount for first month
function calculateProratedAmount(fullAmount, creationDate, targetMonth, targetYear) {
  const creationMonth = creationDate.getMonth() + 1;
  const creationYear = creationDate.getFullYear();
  
  // If not the creation month, return full amount
  if (targetMonth !== creationMonth || targetYear !== creationYear) {
    return fullAmount;
  }
  
  // Calculate prorated amount for creation month
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const creationDay = creationDate.getDate();
  const remainingDays = daysInMonth - creationDay + 1; // +1 to include creation day
  const dailyRate = fullAmount / daysInMonth;
  
  return Math.round(dailyRate * remainingDays * 100) / 100; // Round to 2 decimal places
}

module.exports = router;
