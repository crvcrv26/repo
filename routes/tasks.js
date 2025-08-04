const express = require('express');
const { query, validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all tasks (vehicles with task status)
// @route   GET /api/tasks
// @access  Private
router.get('/', authenticateToken, [
  query('status').optional().custom((value) => {
    if (value === '') return true; // Allow empty string
    return ['pending', 'assigned', 'in_progress', 'recovered', 'failed'].includes(value);
  }),
  query('priority').optional().custom((value) => {
    if (value === '') return true; // Allow empty string
    return ['low', 'medium', 'high', 'urgent'].includes(value);
  }),
  query('assignedTo').optional().isMongoId(),
  query('city').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
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
      status,
      priority,
      assignedTo,
      city,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    // Role-based filtering
    if (req.user.role === 'fieldAgent') {
      filter.assignedTo = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin can see tasks assigned to their field agents
      const fieldAgents = await User.find({ 
        createdBy: req.user._id, 
        role: 'fieldAgent' 
      }).select('_id');
      filter.assignedTo = { $in: fieldAgents.map(u => u._id) };
    }

    // Apply filters
    if (status && status !== '') filter.status = status;
    if (priority && priority !== '') filter.priority = priority;
    if (assignedTo && assignedTo !== '') filter.assignedTo = assignedTo;
    if (city && city !== '') filter['location.city'] = new RegExp(city, 'i');
    if (dateFrom || dateTo) {
      filter.assignedAt = {};
      if (dateFrom) filter.assignedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.assignedAt.$lte = new Date(dateTo);
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const tasks = await Vehicle.find(filter)
      .populate('assignedTo', 'name email phone')
      .populate('recoveryDetails.recoveredBy', 'name')
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(filter);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get task statistics
// @route   GET /api/tasks/stats/overview
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
      completed,
      failed,
      urgent,
      high,
      medium,
      low
    ] = await Promise.all([
      Vehicle.countDocuments(filter),
      Vehicle.countDocuments({ ...filter, status: 'pending' }),
      Vehicle.countDocuments({ ...filter, status: 'assigned' }),
      Vehicle.countDocuments({ ...filter, status: 'in_progress' }),
      Vehicle.countDocuments({ ...filter, status: 'recovered' }),
      Vehicle.countDocuments({ ...filter, status: 'failed' }),
      Vehicle.countDocuments({ ...filter, priority: 'urgent' }),
      Vehicle.countDocuments({ ...filter, priority: 'high' }),
      Vehicle.countDocuments({ ...filter, priority: 'medium' }),
      Vehicle.countDocuments({ ...filter, priority: 'low' })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        assigned,
        inProgress,
        completed,
        failed,
        urgent,
        high,
        medium,
        low
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get agent performance statistics
// @route   GET /api/tasks/agent-performance
// @access  Private (Admin, SuperAdmin)
router.get('/agent-performance', authenticateToken, authorizeRole('admin', 'superAdmin'), async (req, res) => {
  try {
    let agentFilter = { role: 'fieldAgent', isActive: true };

    // Admin can only see their own field agents
    if (req.user.role === 'admin') {
      agentFilter.createdBy = req.user._id;
    }

    const agents = await User.find(agentFilter).select('name email phone');

    const performanceData = await Promise.all(
      agents.map(async (agent) => {
        const [
          totalAssigned,
          completed,
          failed,
          inProgress,
          pending,
          totalOutstanding,
          recoveredAmount
        ] = await Promise.all([
          Vehicle.countDocuments({ assignedTo: agent._id, isActive: true }),
          Vehicle.countDocuments({ assignedTo: agent._id, status: 'recovered', isActive: true }),
          Vehicle.countDocuments({ assignedTo: agent._id, status: 'failed', isActive: true }),
          Vehicle.countDocuments({ assignedTo: agent._id, status: 'in_progress', isActive: true }),
          Vehicle.countDocuments({ assignedTo: agent._id, status: 'pending', isActive: true }),
          Vehicle.aggregate([
            { $match: { assignedTo: agent._id, isActive: true } },
            { $group: { _id: null, total: { $sum: '$financialDetails.outstandingAmount' } } }
          ]),
          Vehicle.aggregate([
            { $match: { assignedTo: agent._id, status: 'recovered', isActive: true } },
            { $group: { _id: null, total: { $sum: '$financialDetails.outstandingAmount' } } }
          ])
        ]);

        const successRate = totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0;

        return {
          agent: {
            _id: agent._id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone
          },
          stats: {
            totalAssigned,
            completed,
            failed,
            inProgress,
            pending,
            successRate: Math.round(successRate * 100) / 100,
            totalOutstanding: totalOutstanding[0]?.total || 0,
            recoveredAmount: recoveredAmount[0]?.total || 0
          }
        };
      })
    );

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Get agent performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 