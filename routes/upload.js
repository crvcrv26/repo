const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const Vehicle = require('../models/Vehicle');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
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
  // Allow Excel files and common document types
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel, CSV, PDF, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// @desc    Upload single file
// @route   POST /api/upload/file
// @access  Private
router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Upload multiple files
// @route   POST /api/upload/files
// @access  Private
router.post('/files', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one file'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
    }));

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Bulk upload vehicles via Excel
// @route   POST /api/upload/bulk-vehicles
// @access  Private (Admin, SuperAdmin)
router.post('/bulk-vehicles', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), upload.single('file'), [
  body('skipFirstRow').optional().isBoolean().withMessage('skipFirstRow must be a boolean')
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid Excel or CSV file'
      });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel file must contain at least a header row and one data row'
      });
    }

    const skipFirstRow = req.body.skipFirstRow === 'true' || req.body.skipFirstRow === true;
    const startIndex = skipFirstRow ? 1 : 0;
    const rows = data.slice(startIndex);

    const results = {
      total: rows.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + (skipFirstRow ? 2 : 1); // +2 because of 0-based index and header

      try {
        // Validate required fields
        const vehicleData = {
          vehicleNumber: row[0]?.toString()?.toUpperCase()?.trim(),
          ownerName: row[1]?.toString()?.trim(),
          ownerPhone: row[2]?.toString()?.trim(),
          ownerEmail: row[3]?.toString()?.trim(),
          vehicleType: row[4]?.toString()?.toLowerCase()?.trim() || 'car',
          make: row[5]?.toString()?.trim(),
          model: row[6]?.toString()?.trim(),
          year: parseInt(row[7]),
          color: row[8]?.toString()?.trim(),
          engineNumber: row[9]?.toString()?.trim(),
          chassisNumber: row[10]?.toString()?.trim(),
          status: row[11]?.toString()?.toLowerCase()?.trim() || 'pending',
          priority: row[12]?.toString()?.toLowerCase()?.trim() || 'medium',
          location: {
            address: row[13]?.toString()?.trim(),
            city: row[14]?.toString()?.trim(),
            state: row[15]?.toString()?.trim(),
            pincode: row[16]?.toString()?.trim()
          },
          financialDetails: {
            loanAmount: parseFloat(row[17]) || 0,
            outstandingAmount: parseFloat(row[18]) || 0,
            defaultAmount: parseFloat(row[19]) || 0,
            defaultDate: row[20] ? new Date(row[20]) : new Date(),
            bankName: row[21]?.toString()?.trim(),
            branchName: row[22]?.toString()?.trim()
          },
          notes: row[23]?.toString()?.trim(),
          tags: row[24]?.toString()?.split(',').map(tag => tag.trim()).filter(tag => tag) || []
        };

        // Validate required fields
        if (!vehicleData.vehicleNumber) {
          throw new Error('Vehicle number is required');
        }
        if (!vehicleData.ownerName) {
          throw new Error('Owner name is required');
        }
        if (!vehicleData.ownerPhone) {
          throw new Error('Owner phone is required');
        }
        if (!vehicleData.make) {
          throw new Error('Vehicle make is required');
        }
        if (!vehicleData.model) {
          throw new Error('Vehicle model is required');
        }
        if (!vehicleData.year || vehicleData.year < 1900 || vehicleData.year > new Date().getFullYear() + 1) {
          throw new Error('Valid year is required');
        }
        if (!vehicleData.location.address) {
          throw new Error('Address is required');
        }
        if (!vehicleData.location.city) {
          throw new Error('City is required');
        }
        if (!vehicleData.location.state) {
          throw new Error('State is required');
        }

        // Check if vehicle number already exists
        const existingVehicle = await Vehicle.findOne({ vehicleNumber: vehicleData.vehicleNumber });
        if (existingVehicle) {
          throw new Error(`Vehicle with number ${vehicleData.vehicleNumber} already exists`);
        }

        // Validate phone number format
        if (!/^[0-9]{10}$/.test(vehicleData.ownerPhone)) {
          throw new Error('Phone number must be 10 digits');
        }

        // Validate email format if provided
        if (vehicleData.ownerEmail && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(vehicleData.ownerEmail)) {
          throw new Error('Invalid email format');
        }

        // Validate vehicle type
        const validVehicleTypes = ['car', 'bike', 'truck', 'bus', 'tractor', 'other'];
        if (!validVehicleTypes.includes(vehicleData.vehicleType)) {
          throw new Error('Invalid vehicle type');
        }

        // Validate status
        const validStatuses = ['pending', 'assigned', 'in_progress', 'recovered', 'failed', 'cancelled'];
        if (!validStatuses.includes(vehicleData.status)) {
          throw new Error('Invalid status');
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(vehicleData.priority)) {
          throw new Error('Invalid priority');
        }

        // Validate pincode if provided
        if (vehicleData.location.pincode && !/^[0-9]{6}$/.test(vehicleData.location.pincode)) {
          throw new Error('Pincode must be 6 digits');
        }

        // Add metadata
        vehicleData.lastUpdatedBy = req.user._id;

        // Create vehicle
        await Vehicle.create(vehicleData);
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Bulk upload completed',
      data: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Download Excel template
// @route   GET /api/upload/template
// @access  Private (Admin, SuperAdmin)
router.get('/template', authenticateToken, authorizeRole('superSuperAdmin', 'admin', 'superAdmin'), async (req, res) => {
  try {
    // Create template data
    const templateData = [
      [
        'Vehicle Number',
        'Owner Name',
        'Owner Phone',
        'Owner Email',
        'Vehicle Type',
        'Make',
        'Model',
        'Year',
        'Color',
        'Engine Number',
        'Chassis Number',
        'Status',
        'Priority',
        'Address',
        'City',
        'State',
        'Pincode',
        'Loan Amount',
        'Outstanding Amount',
        'Default Amount',
        'Default Date',
        'Bank Name',
        'Branch Name',
        'Notes',
        'Tags'
      ],
      [
        'MH12AB1234',
        'John Doe',
        '9876543210',
        'john@example.com',
        'car',
        'Honda',
        'City',
        '2020',
        'White',
        'ENG123456',
        'CHS123456',
        'pending',
        'medium',
        '123 Main Street',
        'Mumbai',
        'Maharashtra',
        '400001',
        '500000',
        '450000',
        '50000',
        '2024-01-15',
        'SBI',
        'Mumbai Branch',
        'Sample notes',
        'urgent,high-value'
      ]
    ];

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { width: 15 }, // Vehicle Number
      { width: 20 }, // Owner Name
      { width: 15 }, // Owner Phone
      { width: 25 }, // Owner Email
      { width: 12 }, // Vehicle Type
      { width: 15 }, // Make
      { width: 15 }, // Model
      { width: 8 },  // Year
      { width: 12 }, // Color
      { width: 15 }, // Engine Number
      { width: 15 }, // Chassis Number
      { width: 12 }, // Status
      { width: 10 }, // Priority
      { width: 30 }, // Address
      { width: 15 }, // City
      { width: 15 }, // State
      { width: 10 }, // Pincode
      { width: 12 }, // Loan Amount
      { width: 15 }, // Outstanding Amount
      { width: 12 }, // Default Amount
      { width: 12 }, // Default Date
      { width: 20 }, // Bank Name
      { width: 20 }, // Branch Name
      { width: 30 }, // Notes
      { width: 20 }  // Tags
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Vehicle Template');

    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="vehicle-upload-template.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 