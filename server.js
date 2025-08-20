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

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Import User model for cleanup
const User = require('./models/User');

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
app.use('/api/admin-payments', authenticateToken, require('./routes/adminPayments'));
app.use('/api/super-super-admin-payments', authenticateToken, require('./routes/superSuperAdminPayments'));
app.use('/api/app-management', require('./routes/appManagement'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 