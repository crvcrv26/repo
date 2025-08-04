const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Vehicle = require('../models/Vehicle');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.env.UPLOAD_PATH || './uploads', 'proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only images and PDFs
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF images and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// @desc    Get proofs for a vehicle
// @route   GET /api/proofs/vehicle/:vehicleId
// @access  Private
router.get('/vehicle/:vehicleId', authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
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
        message: 'You can only view proofs for vehicles assigned to you'
      });
    }

    res.json({
      success: true,
      data: vehicle.recoveryDetails.recoveryPhotos || []
    });
  } catch (error) {
    console.error('Get proofs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Upload proof for a vehicle
// @route   POST /api/proofs/vehicle/:vehicleId
// @access  Private (FieldAgent for their vehicles)
router.post('/vehicle/:vehicleId', authenticateToken, authorizeRole('fieldAgent'), upload.array('proofs', 10), [
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

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one proof file'
      });
    }

    const vehicle = await Vehicle.findById(req.params.vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle is assigned to the current field agent
    if (vehicle.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload proofs for vehicles assigned to you'
      });
    }

    // Process uploaded files
    const uploadedProofs = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/proofs/${file.filename}`,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    }));

    // Add proofs to vehicle
    if (!vehicle.recoveryDetails.recoveryPhotos) {
      vehicle.recoveryDetails.recoveryPhotos = [];
    }

    vehicle.recoveryDetails.recoveryPhotos.push(...uploadedProofs);
    
    // Update recovery notes if provided
    if (req.body.notes) {
      vehicle.recoveryDetails.recoveryNotes = req.body.notes;
    }

    vehicle.lastUpdatedBy = req.user._id;
    await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Proofs uploaded successfully',
      data: uploadedProofs
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    
    // Clean up uploaded files if there was an error
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(file.destination, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Delete a proof
// @route   DELETE /api/proofs/:proofId
// @access  Private (SuperAdmin only)
router.delete('/:proofId', authenticateToken, authorizeRole('superAdmin'), async (req, res) => {
  try {
    // Find vehicle containing this proof
    const vehicle = await Vehicle.findOne({
      'recoveryDetails.recoveryPhotos._id': req.params.proofId
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Proof not found'
      });
    }

    // Find the proof in the vehicle
    const proof = vehicle.recoveryDetails.recoveryPhotos.find(
      p => p._id.toString() === req.params.proofId
    );

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: 'Proof not found'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'proofs', proof.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove proof from vehicle
    vehicle.recoveryDetails.recoveryPhotos = vehicle.recoveryDetails.recoveryPhotos.filter(
      p => p._id.toString() !== req.params.proofId
    );

    vehicle.lastUpdatedBy = req.user._id;
    await vehicle.save();

    res.json({
      success: true,
      message: 'Proof deleted successfully'
    });
  } catch (error) {
    console.error('Delete proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Download a proof file
// @route   GET /api/proofs/download/:proofId
// @access  Private
router.get('/download/:proofId', authenticateToken, async (req, res) => {
  try {
    // Find vehicle containing this proof
    const vehicle = await Vehicle.findOne({
      'recoveryDetails.recoveryPhotos._id': req.params.proofId
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Proof not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'fieldAgent' && vehicle.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find the proof
    const proof = vehicle.recoveryDetails.recoveryPhotos.find(
      p => p._id.toString() === req.params.proofId
    );

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: 'Proof not found'
      });
    }

    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'proofs', proof.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.download(filePath, proof.originalName || proof.filename);
  } catch (error) {
    console.error('Download proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 