const express = require('express');
const { body, validationResult } = require('express-validator');
const FileStorageSettings = require('../models/FileStorageSettings');
const ExcelFile = require('../models/ExcelFile');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all file storage settings
// @route   GET /api/file-storage/settings
// @access  Private (SuperSuperAdmin only)
router.get('/settings',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  async (req, res) => {
    try {
      const settings = await FileStorageSettings.find({ isActive: true })
        .populate('updatedBy', 'name email')
        .sort({ role: 1 });

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching file storage settings:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching file storage settings'
      });
    }
  }
);

// @desc    Get file storage setting for a specific role
// @route   GET /api/file-storage/settings/:role
// @access  Private (SuperSuperAdmin, SuperAdmin, Admin)
router.get('/settings/:role',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  async (req, res) => {
    try {
      const { role } = req.params;
      
      // Validate role
      if (!['admin', 'superAdmin', 'superSuperAdmin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      const setting = await FileStorageSettings.findOne({ 
        role, 
        isActive: true 
      }).populate('updatedBy', 'name email');

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'File storage setting not found for this role'
        });
      }

      res.json({
        success: true,
        data: setting
      });
    } catch (error) {
      console.error('Error fetching file storage setting:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching file storage setting'
      });
    }
  }
);

// @desc    Update file storage setting
// @route   PUT /api/file-storage/settings/:role
// @access  Private (SuperSuperAdmin only)
router.put('/settings/:role',
  authenticateToken,
  authorizeRole('superSuperAdmin'),
  [
    body('totalRecordLimit')
      .isInt({ min: 1000, max: 10000000 })
      .withMessage('Total record limit must be between 1,000 and 10,000,000'),
    body('description')
      .isString()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters')
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

      const { role } = req.params;
      const { totalRecordLimit, description } = req.body;

      // Validate role
      if (!['admin', 'superAdmin', 'superSuperAdmin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Find existing setting
      let setting = await FileStorageSettings.findOne({ role });

      if (setting) {
        // Update existing setting
        setting.totalRecordLimit = totalRecordLimit;
        setting.description = description;
        setting.updatedBy = req.user._id;
        setting.isActive = true;
        await setting.save();
      } else {
        // Create new setting
        setting = new FileStorageSettings({
          role,
          totalRecordLimit,
          description,
          updatedBy: req.user._id
        });
        await setting.save();
      }

      // Populate updatedBy field
      await setting.populate('updatedBy', 'name email');

      res.json({
        success: true,
        message: 'File storage setting updated successfully',
        data: setting
      });
    } catch (error) {
      console.error('Error updating file storage setting:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating file storage setting'
      });
    }
  }
);

// @desc    Get current user's file storage limits and usage
// @route   GET /api/file-storage/my-limits
// @access  Private (SuperSuperAdmin, SuperAdmin, Admin)
router.get('/my-limits',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  async (req, res) => {
    try {
      const setting = await FileStorageSettings.findOne({ 
        role: req.user.role, 
        isActive: true 
      });

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'File storage setting not found for your role'
        });
      }

      // Calculate current usage for this user
      const currentUsage = await ExcelFile.aggregate([
        {
          $match: {
            uploadedBy: req.user._id,
            status: { $in: ['completed', 'partial'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: '$totalRows' }
          }
        }
      ]);

      const usedRecords = currentUsage.length > 0 ? currentUsage[0].totalRecords : 0;
      const remainingRecords = Math.max(0, setting.totalRecordLimit - usedRecords);

      res.json({
        success: true,
        data: {
          role: setting.role,
          totalRecordLimit: setting.totalRecordLimit,
          usedRecords: usedRecords,
          remainingRecords: remainingRecords,
          description: setting.description
        }
      });
    } catch (error) {
      console.error('Error fetching user file storage limits:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching file storage limits'
      });
    }
  }
);

module.exports = router;

