const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const XLSX = require('xlsx');
const { body, validationResult, query } = require('express-validator');
const ExcelFile = require('../models/ExcelFile');
const ExcelVehicle = require('../models/ExcelVehicle');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/excel');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'excel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel') {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  }
});

// Expected Excel headers
const EXPECTED_HEADERS = [
  'registration_number',
  'first_confirmer_name',
  'first_confirmer_no',
  'second_confirmer_name',
  'second_confirmer_no',
  'third_confirmer_name',
  'third_confirmer_no',
  'loan_number',
  'make',
  'chasis_number',
  'engine_number',
  'emi',
  'pos',
  'bucket',
  'customer_name',
  'address',
  'branch',
  'sec_17',
  'seasoning',
  'tbr',
  'allocation',
  'model',
  'product_name'
];

// @desc    Upload Excel file
// @route   POST /api/excel/upload
// @access  Private (SuperSuperAdmin, SuperAdmin, Admin)
router.post('/upload', 
  authenticateToken, 
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  upload.single('excelFile'),
  [
    body('assignedTo').optional().custom((value, { req }) => {
      // SuperSuperAdmin and SuperAdmin must assign to an admin
      if ((req.user.role === 'superSuperAdmin' || req.user.role === 'superAdmin') && !value) {
        throw new Error('Admin assignment is required for super admin uploads');
      }
      return true;
    })
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Determine assigned admin
      let assignedTo = req.user._id;
      if (req.user.role === 'superSuperAdmin' || req.user.role === 'superAdmin') {
        if (!req.body.assignedTo) {
          return res.status(400).json({
            success: false,
            message: 'Admin assignment is required for super admin uploads'
          });
        }
        
        // Verify the assigned admin exists and is active
        const assignedAdmin = await User.findById(req.body.assignedTo);
        if (!assignedAdmin || assignedAdmin.role !== 'admin' || !assignedAdmin.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Invalid admin assignment'
          });
        }
        assignedTo = req.body.assignedTo;
      }

      // Read Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Excel file must contain at least headers and one data row'
        });
      }

      // Validate headers
      const headers = jsonData[0];
      const missingHeaders = EXPECTED_HEADERS.filter(header => !headers.includes(header));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Excel headers',
          missingHeaders: missingHeaders,
          expectedHeaders: EXPECTED_HEADERS
        });
      }

      // Create ExcelFile record
      const excelFile = await ExcelFile.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user._id,
        assignedTo: assignedTo,
        totalRows: jsonData.length - 1, // Exclude header row
        filePath: req.file.path
      });

      // Process data rows in batches for better performance
      const batchSize = 5000; // Increased batch size for better performance
      const dataRows = jsonData.slice(1); // Exclude header row

      // Create header mapping
      const headerMap = {};
      headers.forEach((header, index) => {
        headerMap[index] = header;
      });

      // Create a progress update function
      const updateProgress = async (processed, failed, skipped) => {
        await ExcelFile.findByIdAndUpdate(excelFile._id, {
          processedRows: processed,
          failedRows: failed,
          skippedRows: skipped,
          status: 'processing'
        });
      };

      // Use bulk operations for better performance
      const bulkOps = [];
      let processedRows = 0;
      let failedRows = 0;
      let skippedRows = 0;

      // Process all rows and prepare bulk operations
      dataRows.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because we start from row 2 (after header)
        
        // Skip empty rows
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
          skippedRows++;
          return;
        }

        const vehicleRecord = {
          insertOne: {
            document: {
              excel_file: excelFile._id,
              rowNumber: rowNumber
            }
          }
        };

        // Map data to fields
        Object.keys(headerMap).forEach(columnIndex => {
          const fieldName = headerMap[columnIndex];
          const value = row[columnIndex];
          vehicleRecord.insertOne.document[fieldName] = value ? value.toString().trim() : null;
        });

        bulkOps.push(vehicleRecord);
      });

      // Execute bulk operations in chunks for better memory management
      const chunkSize = 10000;
      for (let i = 0; i < bulkOps.length; i += chunkSize) {
        const chunk = bulkOps.slice(i, i + chunkSize);
        try {
          const result = await ExcelVehicle.bulkWrite(chunk, { 
            ordered: false,
            w: 1 // Write concern
          });
          processedRows += result.insertedCount;
        } catch (error) {
          console.error(`Chunk ${Math.floor(i / chunkSize) + 1} error:`, error.message);
          failedRows += chunk.length;
        }

        // Update progress every 5 chunks
        if ((i / chunkSize + 1) % 5 === 0 || i + chunkSize >= bulkOps.length) {
          await updateProgress(processedRows, failedRows, skippedRows);
        }
      }

      // Update ExcelFile with results
      const status = failedRows === 0 ? 'completed' : 
                    processedRows === 0 ? 'failed' : 'partial';
      
      await ExcelFile.findByIdAndUpdate(excelFile._id, {
        processedRows,
        failedRows,
        skippedRows,
        status,
        errorMessage: failedRows > 0 ? `Failed to process ${failedRows} rows` : null
      });

      res.status(201).json({
        success: true,
        message: 'Excel file uploaded and processed successfully',
        data: {
          fileId: excelFile._id,
          filename: req.file.originalname,
          totalRows: jsonData.length - 1,
          processedRows,
          failedRows,
          skippedRows,
          status
        }
      });

    } catch (error) {
      console.error('Excel upload error:', error);
      
      // Clean up uploaded file if error occurs
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Server error during file upload'
      });
    }
  }
);

// @desc    Get all Excel files (with role-based access)
// @route   GET /api/excel/files
// @access  Private (SuperAdmin, Admin)
router.get('/files',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const { status, search } = req.query;

      // Build aggregation pipeline
      const pipeline = [
        // Match stage for initial filtering
        {
          $match: {
            isActive: true,
            ...(status && { status }),
            ...(req.user.role === 'admin' && {
              $or: [
                { uploadedBy: req.user._id },
                { assignedTo: req.user._id }
              ]
            })
          }
        },

        // Search stage if search term provided
        ...(search ? [{
          $match: {
            $or: [
              { originalName: new RegExp(search, 'i') },
              { filename: new RegExp(search, 'i') }
            ]
          }
        }] : []),

        // Lookup uploadedBy user details
        {
          $lookup: {
            from: 'users',
            localField: 'uploadedBy',
            foreignField: '_id',
            as: 'uploadedByUser',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1
                }
              }
            ]
          }
        },

        // Lookup assignedTo user details
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignedToUser',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1
                }
              }
            ]
          }
        },

        // Unwind the lookups
        {
          $unwind: {
            path: '$uploadedByUser',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$assignedToUser',
            preserveNullAndEmptyArrays: true
          }
        },

        // Project stage to reshape the output
        {
          $project: {
            _id: 1,
            filename: 1,
            originalName: 1,
            fileSize: 1,
            mimeType: 1,
            totalRows: 1,
            processedRows: 1,
            failedRows: 1,
            skippedRows: 1,
            status: 1,
            errorMessage: 1,
            filePath: 1,
            createdAt: 1,
            updatedAt: 1,
            uploadedBy: {
              _id: '$uploadedByUser._id',
              name: '$uploadedByUser.name',
              email: '$uploadedByUser.email'
            },
            assignedTo: {
              _id: '$assignedToUser._id',
              name: '$assignedToUser.name',
              email: '$assignedToUser.email'
            }
          }
        },

        // Sort by createdAt descending
        {
          $sort: { createdAt: -1 }
        }
      ];

      // Add facet stage for pagination
      const facetedPipeline = [
        ...pipeline,
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: (page - 1) * limit },
              { $limit: limit }
            ]
          }
        }
      ];

      // Execute aggregation with optimized pipeline
      const [result] = await ExcelFile.aggregate(facetedPipeline);
      const files = result.data;
      const total = result.metadata[0]?.total || 0;

      res.json({
        success: true,
        data: files,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get Excel files error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Get Excel file by ID
// @route   GET /api/excel/files/:id
// @access  Private (SuperAdmin, Admin)
router.get('/files/:id',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  async (req, res) => {
    try {
      const excelFile = await ExcelFile.findById(req.params.id)
        .populate('uploadedBy', 'name email')
        .populate('assignedTo', 'name email');

      if (!excelFile) {
        return res.status(404).json({
          success: false,
          message: 'Excel file not found'
        });
      }

      // Check access permissions
      if (req.user.role === 'admin' && 
          excelFile.uploadedBy._id.toString() !== req.user._id.toString() &&
          excelFile.assignedTo._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: excelFile
      });

    } catch (error) {
      console.error('Get Excel file error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Delete Excel file and all related vehicle data
// @route   DELETE /api/excel/files/:id
// @access  Private (SuperAdmin, Admin)
router.delete('/files/:id',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  async (req, res) => {
    try {
      const excelFile = await ExcelFile.findById(req.params.id);

      if (!excelFile) {
        return res.status(404).json({
          success: false,
          message: 'Excel file not found'
        });
      }

      // Check access permissions
      if (req.user.role === 'admin' && 
          excelFile.uploadedBy.toString() !== req.user._id.toString() &&
          excelFile.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete all related vehicle data
      await ExcelVehicle.deleteMany({ excel_file: excelFile._id });

      // Delete physical file
      try {
        await fs.unlink(excelFile.filePath);
      } catch (unlinkError) {
        console.error('Error deleting physical file:', unlinkError);
      }

      // Delete ExcelFile record
      await ExcelFile.findByIdAndDelete(excelFile._id);

      res.json({
        success: true,
        message: 'Excel file and all related data deleted successfully'
      });

    } catch (error) {
      console.error('Delete Excel file error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Reassign Excel file to another admin (SuperAdmin only)
// @route   PUT /api/excel/files/:id/reassign
// @access  Private (SuperAdmin)
router.put('/files/:id/reassign',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin'),
  [
    body('assignedTo').notEmpty().withMessage('Admin ID is required')
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

      const excelFile = await ExcelFile.findById(req.params.id);
      if (!excelFile) {
        return res.status(404).json({
          success: false,
          message: 'Excel file not found'
        });
      }

      // Verify the new assigned admin exists and is active
      const newAssignedAdmin = await User.findById(req.body.assignedTo);
      if (!newAssignedAdmin || newAssignedAdmin.role !== 'admin' || !newAssignedAdmin.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin assignment'
        });
      }

      // Update assignment
      excelFile.assignedTo = req.body.assignedTo;
      await excelFile.save();

      res.json({
        success: true,
        message: 'Excel file reassigned successfully',
        data: excelFile
      });

    } catch (error) {
      console.error('Reassign Excel file error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Search vehicles with role-based access
// @route   GET /api/excel/vehicles
// @access  Private (All roles)
router.get('/vehicles',
  authenticateToken,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const { search, searchType, registration_number, loan_number, customer_name, branch, make, model, excelFile } = req.query;

      // Get accessible file IDs first
      let accessibleFileIds = [];
      if (req.user.role === 'admin') {
        accessibleFileIds = await getExcelFileIdsForAdmin(req.user._id);
      } else if (req.user.role === 'fieldAgent') {
        accessibleFileIds = await getExcelFileIdsForFieldAgent(req.user._id);
      } else if (req.user.role === 'auditor') {
        accessibleFileIds = await getExcelFileIdsForAuditor(req.user._id);
      }

      // Build aggregation pipeline for optimized search
      const pipeline = [];

      // Optimized search logic - focus on 4 key fields for better performance
      if (search && search.trim().length >= 4) {
        const searchTerm = search.trim()
        
        // If searchType is specified, search only in that field
        if (searchType && searchType !== 'all') {
          pipeline.push({
            $match: {
              [searchType]: { $regex: searchTerm, $options: 'i' }
            }
          })
        } else {
          // Search only in the 4 most important fields for faster performance
          pipeline.push({
            $match: {
              $or: [
                { registration_number: { $regex: searchTerm, $options: 'i' } },
                { loan_number: { $regex: searchTerm, $options: 'i' } },
                { chasis_number: { $regex: searchTerm, $options: 'i' } },
                { engine_number: { $regex: searchTerm, $options: 'i' } }
              ]
            }
          })
        }
      }

      // Match stage for role-based access and active records
      pipeline.push({
        $match: {
          isActive: true,
          ...(req.user.role !== 'superAdmin' && req.user.role !== 'superSuperAdmin' && {
            excel_file: { $in: accessibleFileIds }
          })
        }
      });

      // Specific field filters
      if (registration_number) {
        pipeline.push({ $match: { registration_number: new RegExp(registration_number, 'i') } });
      }
      if (loan_number) {
        pipeline.push({ $match: { loan_number: new RegExp(loan_number, 'i') } });
      }
      if (customer_name) {
        pipeline.push({ $match: { customer_name: new RegExp(customer_name, 'i') } });
      }
      if (branch) {
        pipeline.push({ $match: { branch: new RegExp(branch, 'i') } });
      }
      if (make) {
        pipeline.push({ $match: { make: new RegExp(make, 'i') } });
      }
      if (model) {
        pipeline.push({ $match: { model: new RegExp(model, 'i') } });
      }

      // Sort by most recent first - do this BEFORE lookup to reduce memory usage
      pipeline.push({
        $sort: { createdAt: -1 }
      });

      // Lookup Excel file details
      pipeline.push({
        $lookup: {
          from: 'excelfiles',
          localField: 'excel_file',
          foreignField: '_id',
          as: 'excelFile',
          pipeline: [
            {
              $project: {
                filename: 1,
                originalName: 1,
                uploadedBy: 1,
                assignedTo: 1,
                createdAt: 1
              }
            }
          ]
        }
      });

      // Unwind the lookup
      pipeline.push({
        $unwind: {
          path: '$excelFile',
          preserveNullAndEmptyArrays: true
        }
      });

      // Add facet stage for pagination
      const facetedPipeline = [
        ...pipeline,
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: (page - 1) * limit },
              { $limit: limit }
            ]
          }
        }
      ];

      // Execute aggregation with disk usage allowed for large datasets
      let result;
      try {
        [result] = await ExcelVehicle.aggregate(facetedPipeline, { allowDiskUse: true });
      } catch (error) {
        console.error('Aggregation error:', error);
        throw error;
      }
      
      const vehicles = result.data;
      const total = result.metadata[0]?.total || 0;

      res.json({
        success: true,
        data: vehicles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Vehicle search error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during vehicle search'
      });
    }
  }
);

// Helper functions for role-based access
async function getExcelFileIdsForAdmin(adminId) {
  const files = await ExcelFile.find({
    $or: [
      { uploadedBy: adminId },
      { assignedTo: adminId }
    ],
    isActive: true
  }).select('_id');
  return files.map(f => f._id);
}

async function getExcelFileIdsForFieldAgent(fieldAgentId) {
  const user = await User.findById(fieldAgentId).populate('createdBy');
  if (!user || !user.createdBy) return [];
  
  const files = await ExcelFile.find({
    $or: [
      { uploadedBy: user.createdBy._id },
      { assignedTo: user.createdBy._id }
    ],
    isActive: true
  }).select('_id');
  return files.map(f => f._id);
}

async function getExcelFileIdsForAuditor(auditorId) {
  const user = await User.findById(auditorId).populate('createdBy');
  if (!user || !user.createdBy) return [];
  
  const files = await ExcelFile.find({
    $or: [
      { uploadedBy: user.createdBy._id },
      { assignedTo: user.createdBy._id }
    ],
    isActive: true
  }).select('_id');
  return files.map(f => f._id);
}

// @desc    Download Excel template
// @route   GET /api/excel/template
// @access  Private (SuperAdmin, Admin)
router.get('/template',
  authenticateToken,
  authorizeRole('superSuperAdmin', 'superAdmin', 'admin'),
  async (req, res) => {
    try {
      // Create template workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([EXPECTED_HEADERS]);
      
      // Add sample row
      const sampleRow = EXPECTED_HEADERS.map(() => 'Sample Data');
      XLSX.utils.sheet_add_aoa(worksheet, [sampleRow], { origin: 'A2' });

      // Set column widths
      const colWidths = EXPECTED_HEADERS.map(() => ({ width: 15 }));
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vehicle Data');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="vehicle_template.xlsx"');
      res.send(buffer);

    } catch (error) {
      console.error('Template download error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router; 