const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const BackOfficeNumber = require('../models/BackOfficeNumber');
const User = require('../models/User');

const router = express.Router();

// Get back office numbers for admin (to manage)
router.get('/admin', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const backOfficeNumbers = await BackOfficeNumber.find({ 
      adminId: req.user._id 
    }).sort({ order: 1, createdAt: 1 });
    
    res.json({
      success: true,
      data: backOfficeNumbers
    });
  } catch (error) {
    console.error('Error fetching back office numbers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get back office numbers for field agents (to display)
router.get('/field-agent', authenticateToken, authorizeRole('fieldAgent'), async (req, res) => {
  try {
    // Get the field agent's admin
    const user = await User.findById(req.user._id).populate('createdBy');
    
    if (!user || !user.createdBy) {
      return res.status(404).json({
        success: false,
        message: 'User not associated with any admin'
      });
    }
    
    // Get active back office numbers for the admin
    const backOfficeNumbers = await BackOfficeNumber.find({ 
      adminId: user.createdBy._id,
      isActive: true 
    }).sort({ order: 1, createdAt: 1 });
    
    res.json({
      success: true,
      data: backOfficeNumbers
    });
  } catch (error) {
    console.error('Error fetching back office numbers for field agent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new back office number
router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, mobileNumber } = req.body;
    
    if (!name || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name and mobile number are required'
      });
    }
    
    // Check if mobile number already exists for this admin
    const existingNumber = await BackOfficeNumber.findOne({
      adminId: req.user._id,
      mobileNumber: mobileNumber.trim()
    });
    
    if (existingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already exists'
      });
    }
    
    // Get the next order number
    const maxOrder = await BackOfficeNumber.findOne({ adminId: req.user._id })
      .sort({ order: -1 })
      .select('order');
    
    const newBackOfficeNumber = new BackOfficeNumber({
      adminId: req.user._id,
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      order: (maxOrder?.order || 0) + 1
    });
    
    await newBackOfficeNumber.save();
    
    res.status(201).json({
      success: true,
      message: 'Back office number created successfully',
      data: newBackOfficeNumber
    });
  } catch (error) {
    console.error('Error creating back office number:', error);
    
    if (error.message.includes('Maximum 4 back office numbers')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update back office number
router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobileNumber, isActive, order } = req.body;
    
    const backOfficeNumber = await BackOfficeNumber.findById(id);
    
    if (!backOfficeNumber) {
      return res.status(404).json({
        success: false,
        message: 'Back office number not found'
      });
    }
    
    // Check if admin owns this back office number
    if (backOfficeNumber.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if mobile number already exists (excluding current record)
    if (mobileNumber && mobileNumber !== backOfficeNumber.mobileNumber) {
      const existingNumber = await BackOfficeNumber.findOne({
        adminId: req.user._id,
        mobileNumber: mobileNumber.trim(),
        _id: { $ne: id }
      });
      
      if (existingNumber) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number already exists'
        });
      }
    }
    
    // Update fields
    if (name !== undefined) backOfficeNumber.name = name.trim();
    if (mobileNumber !== undefined) backOfficeNumber.mobileNumber = mobileNumber.trim();
    if (isActive !== undefined) backOfficeNumber.isActive = isActive;
    if (order !== undefined) backOfficeNumber.order = order;
    
    await backOfficeNumber.save();
    
    res.json({
      success: true,
      message: 'Back office number updated successfully',
      data: backOfficeNumber
    });
  } catch (error) {
    console.error('Error updating back office number:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete back office number
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const backOfficeNumber = await BackOfficeNumber.findById(id);
    
    if (!backOfficeNumber) {
      return res.status(404).json({
        success: false,
        message: 'Back office number not found'
      });
    }
    
    // Check if admin owns this back office number
    if (backOfficeNumber.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await BackOfficeNumber.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Back office number deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting back office number:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Toggle active status
router.put('/:id/toggle', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const backOfficeNumber = await BackOfficeNumber.findById(id);
    
    if (!backOfficeNumber) {
      return res.status(404).json({
        success: false,
        message: 'Back office number not found'
      });
    }
    
    // Check if admin owns this back office number
    if (backOfficeNumber.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    backOfficeNumber.isActive = !backOfficeNumber.isActive;
    await backOfficeNumber.save();
    
    res.json({
      success: true,
      message: `Back office number ${backOfficeNumber.isActive ? 'activated' : 'deactivated'} successfully`,
      data: backOfficeNumber
    });
  } catch (error) {
    console.error('Error toggling back office number status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
