const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const ExcelFile = require('../models/ExcelFile');
const ExcelVehicle = require('../models/ExcelVehicle');
const fs = require('fs').promises;
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users with role-based filtering
// @route   GET /api/users
// @access  Private (Admin, SuperAdmin, Auditor)
router.get('/', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin', 'auditor'), [
  query('role').optional().custom((value) => {
    if (value === '') return true; // Allow empty string
    return ['superSuperAdmin', 'superAdmin', 'admin', 'fieldAgent', 'auditor'].includes(value);
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
    const filter = { isDeleted: { $ne: true } }; // Exclude deleted users from user management

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin can only see users they created
      filter.createdBy = req.user._id;
    } else if (req.user.role === 'auditor') {
      // Auditor can only see field agents under their admin
      if (!req.user.createdBy) {
        return res.status(403).json({
          success: false,
          message: 'Auditor not properly assigned to an admin. Please contact your administrator.'
        });
      }
      filter.createdBy = req.user.createdBy;
      filter.role = 'fieldAgent';
    }
    // Super admin can see all users (no filter applied)

    // Apply filters
    if (role && role !== '') filter.role = role;
    if (city && city !== '') filter['location.city'] = new RegExp(city, 'i');
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search && search.trim() !== '') {
      // Use text search for better performance
      filter.$text = { $search: search.trim() };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    let users;
    try {
      users = await User.find(filter)
        .populate('createdBy', 'name email')
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } catch (error) {
      // Fallback to regex search if text search fails
      if (error.message.includes('text index') && search && search.trim() !== '') {
        const fallbackFilter = { ...filter };
        delete fallbackFilter.$text;
        fallbackFilter.$or = [
          { name: new RegExp(search.trim(), 'i') },
          { email: new RegExp(search.trim(), 'i') },
          { phone: new RegExp(search.trim(), 'i') },
          { 'location.city': new RegExp(search.trim(), 'i') },
          { 'location.state': new RegExp(search.trim(), 'i') }
        ];
        
        users = await User.find(fallbackFilter)
          .populate('createdBy', 'name email')
          .select('-password -resetPasswordToken -resetPasswordExpire')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit));
      } else {
        throw error;
      }
    }

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
router.get('/:id', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), async (req, res) => {
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
router.post('/', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['superSuperAdmin', 'admin', 'fieldAgent', 'auditor']).withMessage('Valid role required'),
  body('assignedTo').optional().custom((value, { req }) => {
    // Only validate assignedTo if user is superAdmin and creating field agent or auditor
    if (req.user.role === 'superAdmin' && (req.body.role === 'fieldAgent' || req.body.role === 'auditor')) {
      if (!value) {
        throw new Error('Admin assignment is required for field agents and auditors');
      }
      // Validate it's a valid MongoDB ObjectId
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Valid admin ID required for assignment');
      }
    }
    return true;
  }),
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
      if (req.body.role === 'superSuperAdmin' || req.body.role === 'superAdmin' || req.body.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only create field agents and auditors'
        });
      }
    } else if (req.user.role === 'superAdmin') {
      // Super admin can create admins, field agents, and auditors
      if (!['admin', 'fieldAgent', 'auditor'].includes(req.body.role)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid role for super admin to create'
        });
      }
    } else if (req.user.role === 'superSuperAdmin') {
      // Super super admin can create super admins, admins, field agents, and auditors
      if (!['superAdmin', 'admin', 'fieldAgent', 'auditor'].includes(req.body.role)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid role for super super admin to create'
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

    // Handle admin assignment for field agents and auditors
    let createdBy = req.user._id;
    
    // If user is admin, automatically assign field agents and auditors to them
    if (req.user.role === 'admin' && (req.body.role === 'fieldAgent' || req.body.role === 'auditor')) {
      createdBy = req.user._id; // Admin creates users under themselves
    }
    // If assignedTo is provided and user is super admin or super super admin, assign to that admin
    else if (req.body.assignedTo && (req.user.role === 'superAdmin' || req.user.role === 'superSuperAdmin')) {
      // Verify the assigned admin exists and is active
      const assignedAdmin = await User.findById(req.body.assignedTo);
      if (!assignedAdmin || assignedAdmin.role !== 'admin' || !assignedAdmin.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin assignment'
        });
      }
      createdBy = req.body.assignedTo;
    }

    const userData = {
      ...req.body,
      email: req.body.email.toLowerCase(),
      createdBy: createdBy,
      adminId: createdBy // Set adminId to the same as createdBy for field agents and auditors
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
router.put('/:id', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('role').optional().isIn(['superSuperAdmin', 'admin', 'fieldAgent', 'auditor']).withMessage('Valid role required'),
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
      if (req.body.role === 'superSuperAdmin' || req.body.role === 'superAdmin' || req.body.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only update field agents and auditors'
        });
      }
    } else if (req.user.role === 'superAdmin') {
      // Super admin can update admins, field agents, and auditors
      if (req.body.role && !['admin', 'fieldAgent', 'auditor'].includes(req.body.role)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid role for super admin to update'
        });
      }
    } else if (req.user.role === 'superSuperAdmin') {
      // Super super admin can update super admins, admins, field agents, and auditors
      if (req.body.role && !['superAdmin', 'admin', 'fieldAgent', 'auditor'].includes(req.body.role)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid role for super super admin to update'
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



// @desc    Get field agents list (for assignment)
// @route   GET /api/users/field-agents/list
// @access  Private (Admin, SuperAdmin)
router.get('/field-agents/list', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), async (req, res) => {
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

// @desc    Get users by admin (hierarchy view)
// @route   GET /api/users/by-admin/:adminId
// @access  Private (Admin, SuperAdmin)
router.get('/by-admin/:adminId', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const adminId = req.params.adminId;
    
    // Check if admin exists
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'admin' && adminId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get field agents and auditors created by this admin
    const [fieldAgents, auditors] = await Promise.all([
      User.find({ createdBy: adminId, role: 'fieldAgent' })
        .select('name email phone location isActive createdAt')
        .sort({ name: 1 }),
      User.find({ createdBy: adminId, role: 'auditor' })
        .select('name email phone location isActive createdAt')
        .sort({ name: 1 })
    ]);

    res.json({
      success: true,
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          location: admin.location,
          isActive: admin.isActive
        },
        fieldAgents,
        auditors
      }
    });
  } catch (error) {
    console.error('Get users by admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user status (activate/deactivate)
// @route   PUT /api/users/:id/status
// @access  Private (SuperSuperAdmin, SuperAdmin, Admin)
router.put('/:id/status', 
  authenticateToken, 
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'), 
  [
    body('isActive').isBoolean().withMessage('Status must be true or false')
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

      const { isActive } = req.body;
      const userId = req.params.id;

      // Prevent deactivating superSuperAdmin
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (targetUser.role === 'superSuperAdmin') {
        return res.status(403).json({
          success: false,
          message: 'SuperSuperAdmin cannot be deactivated or deleted'
        });
      }

      // Authorization checks based on user role
      if (req.user.role === 'admin') {
        // Admin can only manage users they created
        if (targetUser.createdBy?.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only manage users you created'
          });
        }
        // Admin cannot manage other admins or superAdmins
        if (targetUser.role === 'admin' || targetUser.role === 'superAdmin' || targetUser.role === 'superSuperAdmin') {
          return res.status(403).json({
            success: false,
            message: 'You can only manage field agents and auditors'
          });
        }
      } else if (req.user.role === 'superAdmin') {
        // SuperAdmin can only manage users they created or users created by their admins
        const canManage = targetUser.createdBy?.toString() === req.user._id.toString() || 
                         (targetUser.createdBy && await User.findById(targetUser.createdBy).then(u => u?.createdBy?.toString() === req.user._id.toString()));
        
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: 'You can only manage users in your hierarchy'
          });
        }
        // SuperAdmin cannot manage other superAdmins or superSuperAdmin
        if (targetUser.role === 'superAdmin' || targetUser.role === 'superSuperAdmin') {
          return res.status(403).json({
            success: false,
            message: 'You can only manage admins, field agents, and auditors'
          });
        }
      }

      // Handle cascading activation/deactivation based on role hierarchy
      let affectedCount = 0;
      let affectedMessage = '';

      if (targetUser.role === 'superSuperAdmin') {
        // SuperSuperAdmin: Cascade to all SuperAdmins, Admins, Field Agents, and Auditors
        if (!isActive) {
          // Deactivation: Find all SuperAdmins created by this SuperSuperAdmin
          const superAdmins = await User.find({ 
            createdBy: userId, 
            role: 'superAdmin' 
          });
          
                      // Deactivate all SuperAdmins
            if (superAdmins.length > 0) {
              const superAdminIds = superAdmins.map(sa => sa._id);
              await User.updateMany(
                { _id: { $in: superAdminIds } },
                { 
                  isActive: false, 
                  isOnline: false, 
                  lastSeen: new Date(),
                  currentSessionToken: null,
                  sessionCreatedAt: null,
                  sessionExpiresAt: null
                }
              );
            
            // Find all Admins created by these SuperAdmins
            const admins = await User.find({ 
              createdBy: { $in: superAdminIds }, 
              role: 'admin' 
            });
            
            // Deactivate all Admins
            if (admins.length > 0) {
              const adminIds = admins.map(a => a._id);
              await User.updateMany(
                { _id: { $in: adminIds } },
                { 
                  isActive: false, 
                  isOnline: false, 
                  lastSeen: new Date(),
                  currentSessionToken: null,
                  sessionCreatedAt: null,
                  sessionExpiresAt: null
                }
              );
              
              // Deactivate all Field Agents and Auditors created by these Admins
              await User.updateMany(
                { createdBy: { $in: adminIds }, role: { $in: ['fieldAgent', 'auditor'] } },
                { 
                  isActive: false, 
                  isOnline: false, 
                  lastSeen: new Date(),
                  currentSessionToken: null,
                  sessionCreatedAt: null,
                  sessionExpiresAt: null
                }
              );
            }
            
            affectedCount = superAdmins.length + admins.length;
            affectedMessage = `SuperSuperAdmin deactivated successfully. ${superAdmins.length} SuperAdmin(s) and ${admins.length} Admin(s) have also been deactivated.`;
          } else {
            affectedMessage = 'SuperSuperAdmin deactivated successfully.';
          }
        } else {
          // Activation: Find all SuperAdmins created by this SuperSuperAdmin
          const superAdmins = await User.find({ 
            createdBy: userId, 
            role: 'superAdmin' 
          });
          
          // Activate all SuperAdmins
          if (superAdmins.length > 0) {
            const superAdminIds = superAdmins.map(sa => sa._id);
            await User.updateMany(
              { _id: { $in: superAdminIds } },
              { isActive: true }
            );
            
            // Find all Admins created by these SuperAdmins
            const admins = await User.find({ 
              createdBy: { $in: superAdminIds }, 
              role: 'admin' 
            });
            
            // Activate all Admins
            if (admins.length > 0) {
              const adminIds = admins.map(a => a._id);
              await User.updateMany(
                { _id: { $in: adminIds } },
                { isActive: true }
              );
              
              // Activate all Field Agents and Auditors created by these Admins
              await User.updateMany(
                { createdBy: { $in: adminIds }, role: { $in: ['fieldAgent', 'auditor'] } },
                { isActive: true }
              );
            }
            
            affectedCount = superAdmins.length + admins.length;
            affectedMessage = `SuperSuperAdmin activated successfully. ${superAdmins.length} SuperAdmin(s) and ${admins.length} Admin(s) have also been activated.`;
          } else {
            affectedMessage = 'SuperSuperAdmin activated successfully.';
          }
        }
      } else if (targetUser.role === 'superAdmin') {
        // SuperAdmin: Cascade to all Admins, Field Agents, and Auditors
        if (!isActive) {
          // Deactivation: Find all Admins created by this SuperAdmin
          const admins = await User.find({ 
            createdBy: userId, 
            role: 'admin' 
          });
          
          // Deactivate all Admins
          if (admins.length > 0) {
            const adminIds = admins.map(a => a._id);
            await User.updateMany(
              { _id: { $in: adminIds } },
              { 
                isActive: false, 
                isOnline: false, 
                lastSeen: new Date(),
                currentSessionToken: null,
                sessionCreatedAt: null,
                sessionExpiresAt: null
              }
            );
            
            // Deactivate all Field Agents and Auditors created by these Admins
            await User.updateMany(
              { createdBy: { $in: adminIds }, role: { $in: ['fieldAgent', 'auditor'] } },
              { 
                isActive: false, 
                isOnline: false, 
                lastSeen: new Date(),
                currentSessionToken: null,
                sessionCreatedAt: null,
                sessionExpiresAt: null
              }
            );
          }
          
          affectedCount = admins.length;
          affectedMessage = `SuperAdmin deactivated successfully. ${admins.length} Admin(s) have also been deactivated.`;
        } else {
          // Activation: Find all Admins created by this SuperAdmin
          const admins = await User.find({ 
            createdBy: userId, 
            role: 'admin' 
          });
          
          // Activate all Admins
          if (admins.length > 0) {
            const adminIds = admins.map(a => a._id);
            await User.updateMany(
              { _id: { $in: adminIds } },
              { isActive: true }
            );
            
            // Activate all Field Agents and Auditors created by these Admins
            await User.updateMany(
              { createdBy: { $in: adminIds }, role: { $in: ['fieldAgent', 'auditor'] } },
              { isActive: true }
            );
          }
          
          affectedCount = admins.length;
          affectedMessage = `SuperAdmin activated successfully. ${admins.length} Admin(s) have also been activated.`;
        }
      } else if (targetUser.role === 'admin') {
        // Admin: Cascade to all Field Agents and Auditors
        if (!isActive) {
          // Deactivation: Deactivate all Field Agents and Auditors created by this Admin
          const result = await User.updateMany(
            { createdBy: userId, role: { $in: ['fieldAgent', 'auditor'] } },
            { 
              isActive: false, 
              isOnline: false, 
              lastSeen: new Date(),
              currentSessionToken: null,
              sessionCreatedAt: null,
              sessionExpiresAt: null
            }
          );
          
          affectedCount = result.modifiedCount;
          affectedMessage = `Admin deactivated successfully. ${affectedCount} user(s) have also been deactivated.`;
        } else {
          // Activation: Activate all Field Agents and Auditors created by this Admin
          const result = await User.updateMany(
            { createdBy: userId, role: { $in: ['fieldAgent', 'auditor'] } },
            { isActive: true }
          );
          
          affectedCount = result.modifiedCount;
          affectedMessage = `Admin activated successfully. ${affectedCount} user(s) have also been activated.`;
        }
      }

      // Update the target user status
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          isActive,
          // If deactivating, set offline and clear session
          ...(isActive === false && { 
            isOnline: false, 
            lastSeen: new Date(),
            currentSessionToken: null,
            sessionCreatedAt: null,
            sessionExpiresAt: null
          })
        },
        { new: true }
      ).select('-password');

      res.json({
        success: true,
        message: affectedMessage || `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedUser,
        affectedCount,
        forceLogout: !isActive // Signal frontend to handle forced logout
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (SuperSuperAdmin, SuperAdmin, Admin)
router.delete('/:id',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Get the target user
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Protection rules
      if (targetUser.role === 'superSuperAdmin') {
        return res.status(403).json({
          success: false,
          message: 'SuperSuperAdmin cannot be deleted'
        });
      }

      if (targetUser.role === 'superAdmin') {
        return res.status(403).json({
          success: false,
          message: 'SuperAdmin cannot be deleted'
        });
      }

      // Role-based deletion permissions
      if (req.user.role === 'admin') {
        // Admin can only delete users they created (field agents and auditors)
        if (!targetUser.createdBy || !targetUser.createdBy.equals(req.user._id)) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete users you created'
          });
        }
        
        if (!['fieldAgent', 'auditor'].includes(targetUser.role)) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete field agents and auditors'
          });
        }
      } else if (req.user.role === 'superAdmin') {
        // SuperAdmin can delete anyone except superSuperAdmin
        if (targetUser.role === 'superSuperAdmin') {
          return res.status(403).json({
            success: false,
            message: 'SuperAdmin cannot delete superSuperAdmin users'
          });
        }
      }
      // SuperSuperAdmin can delete anyone (no restrictions)

      // Mark user as deleted instead of actually deleting them
      // This preserves payment history and other related data
      targetUser.isActive = false;
      targetUser.isDeleted = true; // Add this field to track deleted users
      targetUser.deletedAt = new Date();
      targetUser.deletedBy = req.user._id;
      targetUser.isOnline = false;
      targetUser.lastSeen = new Date();
      targetUser.currentSessionToken = null;
      targetUser.sessionCreatedAt = null;
      targetUser.sessionExpiresAt = null;
      await targetUser.save();

      // If deleting an admin, also mark their associated users as deleted
      if (targetUser.role === 'admin') {
        const associatedUsers = await User.find({ createdBy: userId });
        for (const associatedUser of associatedUsers) {
          associatedUser.isActive = false;
          associatedUser.isDeleted = true;
          associatedUser.deletedAt = new Date();
          associatedUser.deletedBy = req.user._id;
          associatedUser.isOnline = false;
          associatedUser.lastSeen = new Date();
          associatedUser.currentSessionToken = null;
          associatedUser.sessionCreatedAt = null;
          associatedUser.sessionExpiresAt = null;
          await associatedUser.save();
        }
        
        // Note: Excel files are kept for historical records
        // Only mark them as inactive if needed
      }

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
  }
);

// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Private (Admin, SuperAdmin)
router.put('/:id/password', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    // Update password
    user.password = req.body.newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats/overview
// @access  Private (Admin, SuperAdmin, Auditor)
router.get('/stats/overview', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin', 'auditor'), async (req, res) => {
  try {
    let filter = { isActive: true };

    // Role-based filtering
    if (req.user.role === 'admin') {
      filter.createdBy = req.user._id;
    } else if (req.user.role === 'auditor') {
      // Auditor can only see field agents under their admin
      if (!req.user.createdBy) {
        return res.status(403).json({
          success: false,
          message: 'Auditor not properly assigned to an admin. Please contact your administrator.'
        });
      }
      filter.createdBy = req.user.createdBy;
      filter.role = 'fieldAgent';
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

// @desc    Get list of admin users
// @route   GET /api/users/admins/list
// @access  Private (SuperSuperAdmin, SuperAdmin)
router.get('/admins/list', authenticateToken, authorizeRole('superSuperAdmin', 'superAdmin'), async (req, res) => {
  try {
    const admins = await User.find({ 
      role: 'admin', 
      isActive: true 
    })
    .select('_id name email phone location')
    .sort({ name: 1 });

    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Get admins list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 