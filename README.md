# 🚗 Vehicle Repossession Management System

A comprehensive full-stack web application for managing vehicle repossession operations, built with Node.js, Express, MongoDB, and React.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Setup](#-environment-setup)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Role-Based Access Control](#-role-based-access-control)
- [File Structure](#-file-structure)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔐 Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control** (superAdmin, admin, fieldAgent, auditor)
- **Hierarchical user management** (admins manage their own users)
- **Password reset** via admin interface (no email required)

### 🚗 Vehicle Management
- **Complete CRUD operations** for vehicle records
- **Advanced filtering** (search, status, priority, city, date range)
- **Vehicle assignment** to field agents
- **Status tracking** (pending, assigned, in-progress, recovered, failed)
- **Financial tracking** (outstanding amounts, recovered amounts)

### 👥 User Management
- **User creation and management** with role restrictions
- **User hierarchy** (admin can only manage their own users)
- **Profile management** with location tracking
- **Login history** and activity monitoring

### 📋 Task Management
- **Task assignment** and tracking
- **Agent performance** analytics
- **Status updates** with role-based permissions
- **Priority management** (urgent, high, medium, low)

### 📸 Proof Management
- **File upload** with drag & drop support
- **Multiple file types** (images, PDFs)
- **Proof organization** by vehicle
- **File validation** and size limits
- **Download functionality**

### 📊 Analytics & Reporting
- **Real-time dashboard** with live statistics
- **Interactive charts** (pie charts, bar charts)
- **Performance metrics** for agents
- **Financial reporting** (outstanding vs recovered amounts)

### 📤 Bulk Operations
- **Excel template download** with proper formatting
- **Bulk vehicle upload** with validation
- **Error reporting** with detailed feedback
- **Progress tracking** for large uploads

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **xlsx** - Excel file processing
- **Express Validator** - Input validation
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **React Router** - Navigation
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Heroicons** - Icons
- **Recharts** - Data visualization
- **React Dropzone** - File upload

## 📁 Project Structure

```
repoApp/
├── backend/                 # Backend API server
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── uploads/           # File uploads directory
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   └── main.tsx       # App entry point
│   └── package.json       # Frontend dependencies
├── uploads/               # File uploads (gitignored)
│   ├── proofs/           # Recovery proof files
│   ├── templates/        # Excel templates
│   └── temp/             # Temporary files
├── .env.backend          # Backend environment template
├── .env.frontend         # Frontend environment template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- Git

### Backend Setup
```bash
# Clone the repository
git clone <repository-url>
cd repoApp

# Install backend dependencies
cd backend
npm install

# Copy environment template
cp ../.env.backend .env

# Edit .env file with your configuration
# See Environment Setup section below

# Start the backend server
npm start
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Copy environment template
cp ../.env.frontend .env

# Start the frontend development server
npm run dev
```

## ⚙️ Environment Setup

### Backend Environment (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/repoapp

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_SALT_ROUNDS=12

# Application Info
APP_NAME=Vehicle Repo Management
APP_URL=http://localhost:3000
```

### Frontend Environment (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:5000

# Application Info
VITE_APP_NAME=Vehicle Repo Management
VITE_APP_VERSION=1.0.0
```

## 🎯 Usage

### First Time Setup
1. **Start the backend server** (port 5000)
2. **Start the frontend server** (port 3000)
3. **Create your first super admin user**:
   ```bash
   # Using curl or Postman
   POST http://localhost:5000/api/auth/register
   {
     "name": "Super Admin",
     "email": "admin@repoapp.com",
     "phone": "1234567890",
     "password": "admin123",
     "role": "superAdmin",
     "location": {
       "city": "Mumbai",
       "state": "Maharashtra"
     }
   }
   ```

### Login
- **URL**: http://localhost:3000
- **Default credentials**: admin@repoapp.com / admin123

### Key Features Usage

#### Dashboard
- View real-time statistics
- Monitor vehicle recovery progress
- Track agent performance

#### Vehicle Management
- Add new vehicles with complete details
- Assign vehicles to field agents
- Update vehicle status
- Filter and search vehicles

#### User Management
- Create users with specific roles
- Manage user hierarchy
- Track user activity

#### Task Management
- View assigned tasks
- Update task status
- Monitor agent performance

#### Proof Management
- Upload recovery proofs
- Organize files by vehicle
- Download and view proofs

#### Bulk Upload
- Download Excel template
- Upload multiple vehicles
- View upload results and errors

## 🔌 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout

### Vehicle Endpoints
- `GET /api/vehicles` - Get all vehicles (with filters)
- `POST /api/vehicles` - Create new vehicle
- `GET /api/vehicles/:id` - Get vehicle by ID
- `PUT /api/vehicles/:id` - Update vehicle
- `PUT /api/vehicles/:id/assign` - Assign vehicle to agent
- `PUT /api/vehicles/:id/status` - Update vehicle status
- `DELETE /api/vehicles/:id` - Delete vehicle
- `GET /api/vehicles/stats/overview` - Get vehicle statistics

### User Endpoints
- `GET /api/users` - Get all users (with filters)
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/field-agents/list` - Get field agents
- `GET /api/users/stats/overview` - Get user statistics

### Task Endpoints
- `GET /api/tasks` - Get all tasks (with filters)
- `GET /api/tasks/stats/overview` - Get task statistics
- `GET /api/tasks/agent-performance` - Get agent performance

### Proof Endpoints
- `GET /api/proofs/vehicle/:vehicleId` - Get proofs for vehicle
- `POST /api/proofs/vehicle/:vehicleId` - Upload proofs
- `DELETE /api/proofs/:proofId` - Delete proof
- `GET /api/proofs/download/:proofId` - Download proof

### Upload Endpoints
- `POST /api/upload/file` - Upload single file
- `POST /api/upload/files` - Upload multiple files
- `POST /api/upload/bulk-vehicles` - Bulk upload vehicles
- `GET /api/upload/template` - Download Excel template

## 🔐 Role-Based Access Control

### Super Admin
- **Full system access**
- Can manage all users and vehicles
- Can delete vehicles and proofs
- Can view all statistics and reports

### Admin
- **Limited to their own users**
- Can create field agents and auditors
- Can manage vehicles assigned to their agents
- Can view performance of their agents

### Field Agent
- **Limited to assigned vehicles**
- Can update status of assigned vehicles
- Can upload proofs for assigned vehicles
- Can view their own performance

### Auditor
- **Read-only access**
- Can view vehicles and statistics
- Cannot modify data
- Can generate reports

## 📊 File Structure Details

### Backend Structure
```
backend/
├── models/
│   ├── User.js          # User schema with authentication
│   └── Vehicle.js       # Vehicle schema with financial details
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── users.js         # User management routes
│   ├── vehicles.js      # Vehicle management routes
│   ├── tasks.js         # Task management routes
│   ├── proofs.js        # Proof management routes
│   └── upload.js        # File upload routes
├── middleware/
│   ├── auth.js          # JWT authentication middleware
│   └── errorHandler.js  # Global error handling
├── uploads/             # File storage (gitignored)
└── server.js           # Main server file
```

### Frontend Structure
```
frontend/src/
├── components/
│   └── Layout.tsx       # Main layout component
├── pages/
│   ├── Dashboard.tsx    # Dashboard with statistics
│   ├── Vehicles.tsx     # Vehicle management
│   ├── Users.tsx        # User management
│   ├── Tasks.tsx        # Task management
│   ├── Proofs.tsx       # Proof management
│   ├── Upload.tsx       # Bulk upload
│   └── Profile.tsx      # User profile
├── hooks/
│   └── useAuth.ts       # Authentication hook
├── services/
│   └── api.ts          # API service functions
└── main.tsx            # App entry point
```

## 🚀 Deployment

### Backend Deployment
1. **Set up MongoDB Atlas** or configure local MongoDB
2. **Configure environment variables** for production
3. **Set up file storage** (local or cloud storage)
4. **Deploy to your preferred platform** (Heroku, Vercel, AWS, etc.)

### Frontend Deployment
1. **Build the application**: `npm run build`
2. **Deploy the dist folder** to your hosting platform
3. **Configure environment variables** for production API URL

### Environment Variables for Production
```env
# Backend
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
UPLOAD_PATH=/path/to/uploads

# Frontend
VITE_API_URL=https://your-api-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API endpoints
- Check the console for error messages
- Ensure all environment variables are set correctly

---

**Built with ❤️ for efficient vehicle repossession management** 