const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users with role-based filtering
// @route   GET /api/users
// @access  Private (Admin, SuperAdmin)
router.get('/', authenticateToken, authorizeRole('admin', 'superAdmin'), [
  query('role').optional().custom((value) => {
    if (value === '') return true; // Allow empty string
    return ['superAdmin', 'admin', 'fieldAgent', 'auditor'].includes(value);
  }),
  query('city').optional().isString(),
  query('status').optional().custom((value) => {
    if (value === '') return true; // Allow empty string
    return ['active', 'inactive'].includes(value);
  }),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      role,
      city,
      status,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin can only see users they created
      filter.createdBy = req.user._id;
    }

    // Apply filters
    if (role && role !== '') filter.role = role;
    if (city && city !== '') filter['location.city'] = new RegExp(city, 'i');
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search && search !== '') {
      filter.$text = { $search: search };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .populate('createdBy', 'name email')
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin, SuperAdmin)
router.get('/:id', authenticateToken, authorizeRole('admin', 'superAdmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('createdBy', 'name email')
      .select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'admin' && user.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin, SuperAdmin)
router.post('/', authenticateToken, authorizeRole('admin', 'superAdmin'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'fieldAgent', 'auditor']).withMessage('Valid role required'),
  body('location.city').notEmpty().withMessage('City is required'),
  body('location.state').notEmpty().withMessage('State is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    // Check role permissions
    if (req.user.role === 'admin') {
      if (req.body.role === 'superAdmin' || req.body.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only create field agents and auditors'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: req.body.email.toLowerCase() },
        { phone: req.body.phone }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    const userData = {
      ...req.body,
      email: req.body.email.toLowerCase(),
      createdBy: req.user._id
    };

    const user = await User.create(userData);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin, SuperAdmin)
router.put('/:id', authenticateToken, authorizeRole('admin', 'superAdmin'), [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('role').optional().isIn(['admin', 'fieldAgent', 'auditor']).withMessage('Valid role required'),
  body('location.city').optional().notEmpty().withMessage('City cannot be empty'),
  body('location.state').optional().notEmpty().withMessage('State cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'admin' && user.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check role permissions
    if (req.user.role === 'admin') {
      if (req.body.role === 'superAdmin' || req.body.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only update field agents and auditors'
        });
      }
    }

    // Check if email/phone is being changed and if it already exists
    if (req.body.email || req.body.phone) {
      const existingUser = await User.findOne({
        $or: [
          { email: req.body.email?.toLowerCase() },
          { phone: req.body.phone }
        ],
        _id: { $ne: req.params.id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or phone already exists'
        });
      }
    }

    const updateData = { ...req.body };
    if (req.body.email) {
      updateData.email = req.body.email.toLowerCase();
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .select('-password -resetPasswordToken -resetPasswordExpire');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin, SuperAdmin)
router.delete('/:id', authenticateToken, authorizeRole('admin', 'superAdmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'admin' && user.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if user has assigned vehicles
    const assignedVehicles = await Vehicle.countDocuments({ assignedTo: user._id, isActive: true });
    if (assignedVehicles > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with assigned vehicles'
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get field agents list (for assignment)
// @route   GET /api/users/field-agents/list
// @access  Private (Admin, SuperAdmin)
router.get('/field-agents/list', authenticateToken, authorizeRole('admin', 'superAdmin'), async (req, res) => {
  try {
    let filter = { role: 'fieldAgent', isActive: true };

    // Admin can only see their own field agents
    if (req.user.role === 'admin') {
      filter.createdBy = req.user._id;
    }

    const fieldAgents = await User.find(filter)
      .select('name email phone location')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: fieldAgents
    });
  } catch (error) {
    console.error('Get field agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats/overview
// @access  Private (Admin, SuperAdmin)
router.get('/stats/overview', authenticateToken, authorizeRole('admin', 'superAdmin'), async (req, res) => {
  try {
    let filter = { isActive: true };

    // Role-based filtering
    if (req.user.role === 'admin') {
      filter.createdBy = req.user._id;
    }

    const [
      total,
      active,
      inactive,
      superAdmins,
      admins,
      fieldAgents,
      auditors
    ] = await Promise.all([
      User.countDocuments(filter),
      User.countDocuments({ ...filter, isActive: true }),
      User.countDocuments({ ...filter, isActive: false }),
      User.countDocuments({ ...filter, role: 'superAdmin' }),
      User.countDocuments({ ...filter, role: 'admin' }),
      User.countDocuments({ ...filter, role: 'fieldAgent' }),
      User.countDocuments({ ...filter, role: 'auditor' })
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        superAdmins,
        admins,
        fieldAgents,
        auditors
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 