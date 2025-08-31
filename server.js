const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const excelRoutes = require('./routes/excel');
const otpRoutes = require('./routes/otp');
const notificationRoutes = require('./routes/notifications');
const moneyRoutes = require('./routes/money');
const paymentRoutes = require('./routes/payments');
const fileStorageRoutes = require('./routes/fileStorage');
const backOfficeNumberRoutes = require('./routes/backOfficeNumbers');
const inventoryRoutes = require('./routes/inventory');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Import User model for cleanup
const User = require('./models/User');
const PaymentProof = require('./models/PaymentProof');
const fs = require('fs').promises;

// Security middleware
app.use(helmet({
  // Let other origins (like :3000) embed resources from this server
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // Keep COEP off in dev unless you really need it
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// Rate limiting - exclude auth routes
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.',
//   skip: (req) => req.path.startsWith('/api/auth/') // Skip rate limiting for auth routes
// });

// Specific rate limiter for auth routes with higher limits
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 50 requests per windowMs for auth
//   message: 'Too many authentication attempts, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', limiter);
// app.use('/api/auth', authLimiter);

// CORS configuration
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  
  // Flutter web development
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://localhost:8085',
  'http://localhost:8086',
  'http://localhost:8087',
  'http://localhost:8088',
  'http://localhost:8090',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:8083',
  'http://127.0.0.1:8084',
  'http://127.0.0.1:8085',
  'http://127.0.0.1:8086',
  'http://127.0.0.1:8087',
  'http://127.0.0.1:8088',
  'http://127.0.0.1:8089',
  'http://127.0.0.1:8090',
  
  // Flutter mobile development (your computer's IP)
  'http://192.168.31.60:8080',
  'http://192.168.31.60:8081',
  'http://192.168.31.60:8082',
  'http://192.168.31.60:8083',
  'http://192.168.31.60:8084',
  'http://192.168.31.60:8085',
  'http://192.168.31.60:8086',
  'http://192.168.31.60:8087',
  'http://192.168.31.60:8088',
  'http://192.168.31.60:8089',
  'http://192.168.31.60:8090',
  
  // ngrok domains (wildcard)
  /^https:\/\/.*\.ngrok-free\.app$/,
  /^https:\/\/.*\.ngrok\.io$/,
  /^https:\/\/.*\.ngrok\.app$/,
  
  // Production domains (add your actual domains)
  // 'https://your-frontend-domain.com'
];

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost and local network origins
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || 
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.') ||
          origin.startsWith('http://172.')) {
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));



// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files with logging and CORS headers
app.use('/uploads', (req, res, next) => {
  console.log('📁 Static file request:', req.method, req.url);
  
  // Add CORS headers for static files - more permissive for images
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // CORP (embedding) header — THIS fixes the NotSameOrigin block
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Serve React app static files
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Repo App Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/excel', authenticateToken, excelRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/money', authenticateToken, moneyRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/payment-qr', authenticateToken, require('./routes/paymentQR'));
app.use('/api/file-storage', fileStorageRoutes);
app.use('/api/admin-payments', authenticateToken, require('./routes/adminPayments'));
app.use('/api/super-super-admin-payments', authenticateToken, require('./routes/superSuperAdminPayments'));
app.use('/api/app-management', require('./routes/appManagement'));
app.use('/api/back-office-numbers', authenticateToken, backOfficeNumberRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes.router);

// Test endpoints for inventory (no auth required)
app.get('/api/inventory-test/puppeteer', async (req, res) => {
  try {
    console.log('Testing Puppeteer...');
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    await page.setContent('<html><body><h1>Test PDF</h1><p>This is a test PDF generated by Puppeteer.</p></body></html>');
    
    // Wait a bit for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated test PDF is empty');
    }

    console.log('Test PDF generated successfully. Size:', pdfBuffer.length);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Puppeteer test error:', error);
    res.status(500).json({
      success: false,
      message: 'Puppeteer test failed: ' + error.message
    });
  }
});

app.get('/api/inventory-test/html', async (req, res) => {
  try {
    console.log('Testing HTML generation...');
    
    // Create a mock inventory object for testing
    const mockInventory = {
      inventoryNumber: 'TEST-001',
      adminName: 'Test Admin',
      fieldAgentName: 'Test Field Agent',
      fieldAgentPhone: '1234567890',
      seizureDate: new Date(),
      registrationNumber: 'TEST123',
      customerName: 'Test Customer',
      make: 'Test Make',
      chasisNumber: 'TESTCHASSIS123',
      engineNumber: 'TESTENGINE123',
      driverName: 'Test Driver',
      driverNumber: '9876543210',
      createdAt: new Date()
    };
    
        // Import the generateInventoryHTML function
    const { generateInventoryHTML } = require('./routes/inventory');
    
    const htmlContent = generateInventoryHTML(mockInventory);
    console.log('HTML generated successfully. Length:', htmlContent.length);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="test-inventory.html"');
    res.send(htmlContent);

  } catch (error) {
    console.error('HTML generation test error:', error);
    res.status(500).json({
      success: false,
      message: 'HTML generation test failed: ' + error.message
    });
  }
});

// Manual cleanup endpoint for testing (remove in production)
app.post('/api/cleanup/payment-proofs', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // First, let's see all approved proofs to understand what we're working with
    const allApprovedProofs = await PaymentProof.find({
      status: 'approved',
      proofType: 'screenshot',
      proofImageName: { $exists: true, $ne: null }
    });
    
    console.log('🔍 All approved proofs found:', allApprovedProofs.length);
    allApprovedProofs.forEach((proof, index) => {
      console.log(`Proof ${index + 1}:`, {
        id: proof._id,
        status: proof.status,
        reviewedAt: proof.reviewedAt,
        proofImageName: proof.proofImageName,
        proofImageUrl: proof.proofImageUrl
      });
    });
    
    const approvedProofs = await PaymentProof.find({
      status: 'approved',
      reviewedAt: { $lt: sevenDaysAgo },
      proofType: 'screenshot',
      proofImageName: { $exists: true, $ne: null }
    });
    
    console.log('🔍 Proofs older than 7 days:', approvedProofs.length);
    console.log('🔍 Seven days ago timestamp:', sevenDaysAgo);
    
    let deletedCount = 0;
    
    for (const proof of approvedProofs) {
      try {
        console.log(`🔍 Processing proof: ${proof._id}`);
        console.log(`   - Image name: ${proof.proofImageName}`);
        console.log(`   - Image URL: ${proof.proofImageUrl}`);
        
        // Determine the correct directory and extract the actual filename from the URL
        let uploadDir = 'payment-proofs'; // default
        let actualFileName = proof.proofImageName; // fallback to original name
        
        if (proof.proofImageUrl) {
          if (proof.proofImageUrl.includes('super-admin-payment-proofs')) {
            uploadDir = 'super-admin-payment-proofs';
          } else if (proof.proofImageUrl.includes('admin-payment-proofs')) {
            uploadDir = 'admin-payment-proofs';
          } else if (proof.proofImageUrl.includes('payment-proofs')) {
            uploadDir = 'payment-proofs';
          }
          
          // Extract the actual filename from the URL
          const urlParts = proof.proofImageUrl.split('/');
          if (urlParts.length > 0) {
            actualFileName = urlParts[urlParts.length - 1];
          }
        }
        
        console.log(`   - Determined directory: ${uploadDir}`);
        console.log(`   - Actual filename from URL: ${actualFileName}`);
        
        const imagePath = path.join(__dirname, 'uploads', uploadDir, actualFileName);
        console.log(`   - Full image path: ${imagePath}`);
        
        // Check if file exists before trying to delete
        try {
          await fs.access(imagePath);
          console.log(`   - File exists, attempting deletion...`);
        } catch (accessError) {
          console.log(`   - File does not exist: ${accessError.message}`);
          continue;
        }
        
        await fs.unlink(imagePath);
        console.log(`   - File deleted successfully`);
        
        await PaymentProof.findByIdAndUpdate(proof._id, {
          $unset: { proofImageUrl: 1, proofImageName: 1 }
        });
        console.log(`   - Database record updated`);
        
        deletedCount++;
        console.log(`✅ Manual cleanup: Deleted ${proof.proofImageName} from ${uploadDir}`);
      } catch (fileError) {
        console.error(`❌ Error processing proof ${proof._id}:`, fileError.message);
        console.error(`   - Image name: ${proof.proofImageName}`);
        console.error(`   - Image URL: ${proof.proofImageUrl}`);
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} payment proof photos`,
      totalFound: approvedProofs.length,
      deletedCount,
      allApprovedCount: allApprovedProofs.length,
      sevenDaysAgo: sevenDaysAgo.toISOString()
    });
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup'
    });
  }
});

// Serve React app for all non-API routes
app.use('*', (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
  
  // Serve the React app's index.html for all other routes
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 External access: http://192.168.31.60:${PORT}/health`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

// Cleanup inactive users every 5 minutes
setInterval(async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await User.updateMany(
      { 
        isOnline: true, 
        lastSeen: { $lt: fiveMinutesAgo } 
      },
      { 
        isOnline: false 
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} inactive users as offline`);
    }
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Cleanup approved payment proof photos after 7 days
setInterval(async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find approved payment proofs that were reviewed more than 7 days ago
    const approvedProofs = await PaymentProof.find({
      status: 'approved',
      reviewedAt: { $lt: sevenDaysAgo },
      proofType: 'screenshot',
      proofImageName: { $exists: true, $ne: null }
    });

    if (approvedProofs.length > 0) {
      console.log(`🗑️ Found ${approvedProofs.length} approved payment proofs to cleanup`);

      for (const proof of approvedProofs) {
        try {
          // Determine the correct directory and extract the actual filename from the URL
          let uploadDir = 'payment-proofs'; // default
          let actualFileName = proof.proofImageName; // fallback to original name
          
          if (proof.proofImageUrl) {
            if (proof.proofImageUrl.includes('super-admin-payment-proofs')) {
              uploadDir = 'super-admin-payment-proofs';
            } else if (proof.proofImageUrl.includes('admin-payment-proofs')) {
              uploadDir = 'admin-payment-proofs';
            } else if (proof.proofImageUrl.includes('payment-proofs')) {
              uploadDir = 'payment-proofs';
            }
            
            // Extract the actual filename from the URL
            const urlParts = proof.proofImageUrl.split('/');
            if (urlParts.length > 0) {
              actualFileName = urlParts[urlParts.length - 1];
            }
          }

          // Delete the image file
          const imagePath = path.join(__dirname, 'uploads', uploadDir, actualFileName);
          await fs.unlink(imagePath);
          console.log(`✅ Deleted payment proof image: ${actualFileName} from ${uploadDir}`);

          // Update the proof record to remove image references
          await PaymentProof.findByIdAndUpdate(proof._id, {
            $unset: { proofImageUrl: 1, proofImageName: 1 }
          });
          console.log(`✅ Updated payment proof record: ${proof._id}`);

        } catch (fileError) {
          console.error(`❌ Error deleting file ${actualFileName}:`, fileError.message);
          // Continue with other files even if one fails
        }
      }

      console.log(`✅ Payment proof cleanup completed for ${approvedProofs.length} records`);
    }
  } catch (error) {
    console.error('Error cleaning up payment proof photos:', error);
  }
}, 24 * 60 * 60 * 1000); // Run every 24 hours

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 