const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { authenticateToken, authorizeRole, authorizeResource } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all vehicles with advanced filtering
// @route   GET /api/vehicles
// @access  Private
router.get('/', authenticateToken, [
  query('search').optional().isString(),
  query('status').optional().custom((value) => {
    if (value === '') return true; // Allow empty string
    return ['pending', 'assigned', 'in_progress', 'recovered', 'failed', 'cancelled'].includes(value);
  }),
  query('priority').optional().custom((value) => {
    if (value === '') return true; // Allow empty string
    return ['low', 'medium', 'high', 'urgent'].includes(value);
  }),
  query('city').optional().isString(),
  query('assignedTo').optional().isMongoId(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc'])
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
      search,
      status,
      priority,
      city,
      assignedTo,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    // Role-based filtering
    if (req.user.role === 'fieldAgent') {
      filter.assignedTo = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin can see vehicles assigned to their field agents
      const fieldAgents = await User.find({ 
        createdBy: req.user._id, 
        role: 'fieldAgent' 
      }).select('_id');
      filter.assignedTo = { $in: fieldAgents.map(u => u._id) };
    }

    // Apply filters
    if (search && search !== '') {
      filter.$text = { $search: search };
    }
    if (status && status !== '') filter.status = status;
    if (priority && priority !== '') filter.priority = priority;
    if (city && city !== '') filter['location.city'] = new RegExp(city, 'i');
    if (assignedTo && assignedTo !== '') filter.assignedTo = assignedTo;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const vehicles = await Vehicle.find(filter)
      .populate('assignedTo', 'name email phone')
      .populate('recoveryDetails.recoveredBy', 'name')
      .populate('lastUpdatedBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(filter);

    res.json({
      success: true,
      data: vehicles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('recoveryDetails.recoveredBy', 'name')
      .populate('lastUpdatedBy', 'name');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'fieldAgent' && vehicle.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private (Admin, SuperAdmin)
router.post('/', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), [
  body('vehicleNumber').notEmpty().withMessage('Vehicle number is required'),
  body('ownerName').notEmpty().withMessage('Owner name is required'),
  body('ownerPhone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('make').notEmpty().withMessage('Vehicle make is required'),
  body('model').notEmpty().withMessage('Vehicle model is required'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid year required'),
  body('location.address').notEmpty().withMessage('Address is required'),
  body('location.city').notEmpty().withMessage('City is required'),
  body('location.state').notEmpty().withMessage('State is required'),
  body('financialDetails.loanAmount').isFloat({ min: 0 }).withMessage('Valid loan amount required'),
  body('financialDetails.outstandingAmount').isFloat({ min: 0 }).withMessage('Valid outstanding amount required'),
  body('financialDetails.defaultAmount').isFloat({ min: 0 }).withMessage('Valid default amount required'),
  body('financialDetails.defaultDate').isISO8601().withMessage('Valid default date required')
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

    // Check if vehicle number already exists
    const existingVehicle = await Vehicle.findOne({ vehicleNumber: req.body.vehicleNumber.toUpperCase() });
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this number already exists'
      });
    }

    const vehicleData = {
      ...req.body,
      vehicleNumber: req.body.vehicleNumber.toUpperCase(),
      lastUpdatedBy: req.user._id
    };

    const vehicle = await Vehicle.create(vehicleData);

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle
    });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Admin, SuperAdmin)
router.put('/:id', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), [
  body('vehicleNumber').optional().notEmpty().withMessage('Vehicle number cannot be empty'),
  body('ownerName').optional().notEmpty().withMessage('Owner name cannot be empty'),
  body('ownerPhone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('make').optional().notEmpty().withMessage('Vehicle make cannot be empty'),
  body('model').optional().notEmpty().withMessage('Vehicle model cannot be empty'),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid year required')
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

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle number is being changed and if it already exists
    if (req.body.vehicleNumber && req.body.vehicleNumber.toUpperCase() !== vehicle.vehicleNumber) {
      const existingVehicle = await Vehicle.findOne({ 
        vehicleNumber: req.body.vehicleNumber.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this number already exists'
        });
      }
    }

    const updateData = {
      ...req.body,
      lastUpdatedBy: req.user._id
    };

    if (req.body.vehicleNumber) {
      updateData.vehicleNumber = req.body.vehicleNumber.toUpperCase();
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email phone');

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updatedVehicle
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Assign vehicle to agent
// @route   PUT /api/vehicles/:id/assign
// @access  Private (Admin, SuperAdmin)
router.put('/:id/assign', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), [
  body('assignedTo').isMongoId().withMessage('Valid agent ID required')
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

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if agent exists and is a field agent
    const agent = await User.findById(req.body.assignedTo);
    if (!agent || agent.role !== 'fieldAgent') {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent ID or agent is not a field agent'
      });
    }

    // Check if admin is assigning to their own field agent
    if (req.user.role === 'admin') {
      if (agent.createdBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign to your own field agents'
        });
      }
    }

    vehicle.assignedTo = req.body.assignedTo;
    vehicle.assignedAt = new Date();
    vehicle.status = 'assigned';
    vehicle.lastUpdatedBy = req.user._id;

    await vehicle.save();

    const updatedVehicle = await Vehicle.findById(req.params.id)
      .populate('assignedTo', 'name email phone');

    res.json({
      success: true,
      message: 'Vehicle assigned successfully',
      data: updatedVehicle
    });
  } catch (error) {
    console.error('Assign vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update vehicle status
// @route   PUT /api/vehicles/:id/status
// @access  Private (FieldAgent for their vehicles, Admin/SuperAdmin for all)
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['pending', 'assigned', 'in_progress', 'recovered', 'failed', 'cancelled']).withMessage('Valid status required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
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

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check permissions
    if (req.user.role === 'fieldAgent') {
      if (vehicle.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update status of vehicles assigned to you'
        });
      }
    }

    vehicle.status = req.body.status;
    vehicle.notes = req.body.notes || vehicle.notes;
    vehicle.lastUpdatedBy = req.user._id;

    // Update recovery details if status is recovered
    if (req.body.status === 'recovered') {
      vehicle.recoveryDetails.recoveredAt = new Date();
      vehicle.recoveryDetails.recoveredBy = req.user._id;
    }

    await vehicle.save();

    const updatedVehicle = await Vehicle.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('recoveryDetails.recoveredBy', 'name');

    res.json({
      success: true,
      message: 'Vehicle status updated successfully',
      data: updatedVehicle
    });
  } catch (error) {
    console.error('Update vehicle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete vehicle (soft delete)
// @route   DELETE /api/vehicles/:id
// @access  Private (SuperAdmin only)
router.delete('/:id', authenticateToken, authorizeRole('superSuperAdmin', 'superAdmin'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    vehicle.isActive = false;
    vehicle.lastUpdatedBy = req.user._id;
    await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get vehicle statistics
// @route   GET /api/vehicles/stats/overview
// @access  Private
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    let filter = { isActive: true };

    // Role-based filtering
    if (req.user.role === 'fieldAgent') {
      filter.assignedTo = req.user._id;
    } else if (req.user.role === 'admin') {
      const fieldAgents = await User.find({ 
        createdBy: req.user._id, 
        role: 'fieldAgent' 
      }).select('_id');
      filter.assignedTo = { $in: fieldAgents.map(u => u._id) };
    }

    const [
      total,
      pending,
      assigned,
      inProgress,
      recovered,
      failed,
      totalOutstanding,
      recoveredAmount
    ] = await Promise.all([
      Vehicle.countDocuments(filter),
      Vehicle.countDocuments({ ...filter, status: 'pending' }),
      Vehicle.countDocuments({ ...filter, status: 'assigned' }),
      Vehicle.countDocuments({ ...filter, status: 'in_progress' }),
      Vehicle.countDocuments({ ...filter, status: 'recovered' }),
      Vehicle.countDocuments({ ...filter, status: 'failed' }),
      Vehicle.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$financialDetails.outstandingAmount' } } }
      ]),
      Vehicle.aggregate([
        { $match: { ...filter, status: 'recovered' } },
        { $group: { _id: null, total: { $sum: '$financialDetails.outstandingAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        assigned,
        inProgress,
        recovered,
        failed,
        totalOutstanding: totalOutstanding[0]?.total || 0,
        recoveredAmount: recoveredAmount[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get vehicle stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 
module.exports = router; 