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

      // Clear search cache after new data upload
      clearSearchCache();

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

// In-memory cache for search results (30 second TTL for fresh data)
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 30 seconds (much shorter for fresh uploads)

// Function to clear search cache when new data is uploaded
function clearSearchCache() {
  searchCache.clear();
  console.log('🗑️ Search cache cleared due to new data upload');
}

// @desc    ULTRA-FAST vehicle search - only 3 key fields
// @route   GET /api/excel/vehicles  
// @access  Private (All roles)
router.get('/vehicles',
  authenticateToken,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Reduced max limit
      const { search, searchType } = req.query;

      // Validate search term
      if (!search || search.trim().length < 3) {
        return res.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
          message: 'Enter at least 3 characters to search'
        });
      }

      const searchTerm = search.trim();
      const cacheKey = `${req.user._id}-${searchTerm.toLowerCase()}-${searchType}-${page}-partial`;
      
      // Check cache first (INSTANT response for cached partial-match searches)
      const cached = searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`⚡ Cache hit for partial-match search: "${searchTerm}" (0ms)`);
        return res.json(cached.data);
      }

      // Get accessible file IDs (cached per user)
      let accessibleFileIds = [];
      if (req.user.role === 'admin') {
        accessibleFileIds = await getExcelFileIdsForAdmin(req.user._id);
      } else if (req.user.role === 'fieldAgent') {
        accessibleFileIds = await getExcelFileIdsForFieldAgent(req.user._id);
      } else if (req.user.role === 'auditor') {
        accessibleFileIds = await getExcelFileIdsForAuditor(req.user._id);
      }

      // Build FAST query (no aggregation pipeline!)
      const baseQuery = {
        isActive: true,
        ...(accessibleFileIds.length > 0 && 
           req.user.role !== 'superAdmin' && 
           req.user.role !== 'superSuperAdmin' ? 
           { excel_file: { $in: accessibleFileIds } } : {})
      };

      // SMART SEARCH STRATEGY - ANYWHERE IN STRING (supports partial matches)
      let searchQuery;
      
      // Escape special regex characters for safety
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      if (searchType && searchType !== 'all') {
        // Specific field search (matches anywhere in the field)
        if (['registration_number', 'chasis_number', 'engine_number'].includes(searchType)) {
          searchQuery = {
            ...baseQuery,
            [searchType]: { $regex: escapedTerm, $options: 'i' } // Matches anywhere in string
          };
        } else {
          // Fallback for any other searchType
          searchQuery = {
            ...baseQuery,
            $or: [
              { registration_number: { $regex: escapedTerm, $options: 'i' } },
              { chasis_number: { $regex: escapedTerm, $options: 'i' } },
              { engine_number: { $regex: escapedTerm, $options: 'i' } }
            ]
          };
        }
      } else {
        // Multi-field search (ANYWHERE in 3 fields for maximum flexibility)
        searchQuery = {
          ...baseQuery,
          $or: [
            { registration_number: { $regex: escapedTerm, $options: 'i' } },
            { chasis_number: { $regex: escapedTerm, $options: 'i' } },
            { engine_number: { $regex: escapedTerm, $options: 'i' } }
          ]
        };
      }

      // PERFORMANCE MONITORING
      const startTime = Date.now();
      
      // Execute LIGHTNING-FAST queries (parallel execution)
      const [total, vehicles] = await Promise.all([
        // Count total (fast with our new indexes)
        ExcelVehicle.countDocuments(searchQuery),
        
        // Get vehicles with ALL REQUIRED FIELDS populated
        ExcelVehicle.find(searchQuery)
          .populate('excel_file', 'filename originalName uploadedBy uploadedAt', null, { lean: true })
          .select('registration_number chasis_number engine_number customer_name branch excel_file createdAt rowNumber loan_number make model emi pos bucket address sec_17 seasoning allocation product_name first_confirmer_name first_confirmer_no second_confirmer_name second_confirmer_no third_confirmer_name third_confirmer_no')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean() // Massive performance boost
      ]);

      const queryTime = Date.now() - startTime;
      console.log(`🚀 PARTIAL-MATCH search completed in ${queryTime}ms for "${searchTerm}" (${vehicles.length} results) - supports anywhere in string`);

      // Prepare response with performance metrics
      const response = {
        success: true,
        data: vehicles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        performance: {
          queryTime: `${queryTime}ms`,
          resultsCount: vehicles.length,
          cached: false,
          searchType: searchType === 'all' ? 'multi-field' : searchType,
          partialMatch: true
        }
      };

      // Cache the result (next identical search will be INSTANT)
      searchCache.set(cacheKey, {
        data: { ...response, performance: { ...response.performance, cached: true } },
        timestamp: Date.now()
      });

      // Cleanup old cache entries (prevent memory leaks)
      if (searchCache.size > 1000) {
        const cutoffTime = Date.now() - CACHE_TTL;
        for (const [key, value] of searchCache.entries()) {
          if (value.timestamp < cutoffTime) {
            searchCache.delete(key);
          }
        }
      }

      res.json(response);

    } catch (error) {
      console.error('🔥 ULTRA-FAST search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search error - please try again',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Get all vehicles for offline sync
// @route   GET /api/excel/vehicles/sync
// @access  Private (All roles)
router.get('/vehicles/sync',
  authenticateToken,
  async (req, res) => {
    try {
      console.log('🔄 Offline sync request from user:', req.user._id, 'role:', req.user.role);

      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 100, 500); // Limit to prevent memory issues

      // Get accessible file IDs (cached per user)
      let accessibleFileIds = [];
      if (req.user.role === 'admin') {
        accessibleFileIds = await getExcelFileIdsForAdmin(req.user._id);
      } else if (req.user.role === 'fieldAgent') {
        accessibleFileIds = await getExcelFileIdsForFieldAgent(req.user._id);
      } else if (req.user.role === 'auditor') {
        accessibleFileIds = await getExcelFileIdsForAuditor(req.user._id);
      }

      // Build query for all accessible vehicles
      const baseQuery = {
        isActive: true,
        ...(accessibleFileIds.length > 0 && 
           req.user.role !== 'superAdmin' && 
           req.user.role !== 'superSuperAdmin' ? 
           { excel_file: { $in: accessibleFileIds } } : {})
      };

      console.log('🔍 Query for offline sync:', JSON.stringify(baseQuery));

      // Get total count for pagination
      const totalCount = await ExcelVehicle.countDocuments(baseQuery);
      console.log(`📊 Total vehicles available: ${totalCount}`);

      // Get vehicles with pagination
      const vehicles = await ExcelVehicle.find(baseQuery)
        .populate('excel_file', 'filename originalName uploadedBy uploadedAt', null, { lean: true })
        .select('registration_number chasis_number engine_number customer_name customer_phone customer_email address branch excel_file createdAt rowNumber loan_number make model emi pos bucket sec_17 seasoning allocation product_name first_confirmer_name first_confirmer_no second_confirmer_name second_confirmer_no third_confirmer_name third_confirmer_no assigned_to file_name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      console.log(`✅ Found ${vehicles.length} vehicles for offline sync (page ${page}, limit ${limit})`);

      res.json({
        success: true,
        data: vehicles,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        message: `Successfully retrieved ${vehicles.length} vehicles for offline use (page ${page} of ${Math.ceil(totalCount / limit)})`,
        count: vehicles.length,
        totalCount
      });

    } catch (error) {
      console.error('❌ Error in offline sync:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicles for offline sync',
        error: error.message
      });
    }
  }
);

// CACHED HELPER FUNCTIONS (much faster with caching)
async function getExcelFileIdsForAdmin(adminId) {
  const cacheKey = `admin_files_${adminId}`;
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const files = await ExcelFile.find({ uploadedBy: adminId }).select('_id').lean();
  const fileIds = files.map(file => file._id);
  
  searchCache.set(cacheKey, {
    data: fileIds,
    timestamp: Date.now()
  });
  
  return fileIds;
}

async function getExcelFileIdsForFieldAgent(fieldAgentId) {
  const cacheKey = `field_files_${fieldAgentId}`;
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const fieldAgent = await User.findById(fieldAgentId).select('createdBy').lean();
  if (!fieldAgent || !fieldAgent.createdBy) return [];
  
  const files = await ExcelFile.find({ uploadedBy: fieldAgent.createdBy }).select('_id').lean();
  const fileIds = files.map(file => file._id);
  
  searchCache.set(cacheKey, {
    data: fileIds,
    timestamp: Date.now()
  });
  
  return fileIds;
}

async function getExcelFileIdsForAuditor(auditorId) {
  const cacheKey = `auditor_files_${auditorId}`;
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const auditor = await User.findById(auditorId).select('createdBy').lean();
  if (!auditor || !auditor.createdBy) return [];
  
  const files = await ExcelFile.find({ uploadedBy: auditor.createdBy }).select('_id').lean();
  const fileIds = files.map(file => file._id);
  
  searchCache.set(cacheKey, {
    data: fileIds,
    timestamp: Date.now()
  });
  
  return fileIds;
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

// @desc    Get vehicle master data by registration number (for money management prefill)
// @route   GET /api/excel/vehicles/by-reg/:registrationNumber
// @access  Private (Admin, Auditor)
router.get('/vehicles/by-reg/:registrationNumber',
  authenticateToken,
  authorizeRole('admin', 'auditor'),
  async (req, res) => {
    try {
      const { registrationNumber } = req.params;
      
      if (!registrationNumber) {
        return res.status(400).json({
          success: false,
          message: 'Registration number is required'
        });
      }

      const startTime = Date.now();
      
      // Search for vehicle with exact registration number match
      const vehicle = await ExcelVehicle.findOne({
        registration_number: new RegExp(`^${registrationNumber.trim()}$`, 'i'),
        isActive: true
      })
      .select('registration_number make model bank customer_name loan_number status')
      .lean();

      const queryTime = Date.now() - startTime;
      console.log(`🔍 Vehicle lookup for ${registrationNumber}: ${queryTime}ms`);

      if (!vehicle) {
        return res.json({
          success: true,
          found: false,
          message: 'Vehicle not found in master data'
        });
      }

      res.json({
        success: true,
        found: true,
        data: {
          registration_number: vehicle.registration_number,
          make: vehicle.make || '',
          model: vehicle.model || '',
          bank: vehicle.bank || '',
          customer_name: vehicle.customer_name || '',
          loan_number: vehicle.loan_number || '',
          status: vehicle.status || ''
        }
      });

    } catch (error) {
      console.error('Error fetching vehicle master data:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching vehicle data'
      });
    }
  }
);

module.exports = router; 