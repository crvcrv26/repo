# AWS Hosting Guide - Complete Setup

## 🚀 Quick Setup (After AWS Wipe)

### Step 1: Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install serve for frontend
sudo npm install -g serve

# Install Git
sudo apt install git -y
```

### Step 2: Clone Repository
```bash
git clone https://github.com/crvcrv26/repo.git
cd repo
```

### Step 3: Install Dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Step 4: Environment Setup
```bash
# Create .env file for backend
nano .env
```

**Backend .env content:**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://amarjeetbrown:wOgbce2ULlBDDazx@repo.npbhh0j.mongodb.net/
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
```

**Frontend .env content:**
```bash
cd frontend
nano .env
```

```env
VITE_API_URL=http://YOUR_PUBLIC_IP:5000/api
```

### Step 5: Build Frontend
```bash
cd frontend
npm run build
cd ..
```

### Step 6: Database Setup
```bash
# Create admin users
node script/create-admins.js

# Initialize file storage settings
node script/init-file-storage-settings.js
```

### Step 7: Start with Memory Optimization
```bash
# Make script executable
chmod +x restart-with-memory-optimization.sh

# Start everything
./restart-with-memory-optimization.sh
```

## 🔧 IP Configuration Changes

### Backend CORS (server.js)
**Find this section and add your IPs:**
```javascript
const allowedOrigins = [
  // Add your AWS public IP
  'http://YOUR_PUBLIC_IP:3000',
  'http://YOUR_PUBLIC_IP:5000',
  
  // Add your AWS private IP
  'http://YOUR_PRIVATE_IP:3000',
  'http://YOUR_PRIVATE_IP:5000',
  
  // Keep existing localhost entries
  'http://localhost:3000',
  'http://localhost:5000',
  // ... rest of existing entries
];
```

### Frontend API Configuration
**In frontend/src/services/api.ts:**
```javascript
const getApiBaseUrl = () => {
  const currentHost = window.location.hostname;
  
  // Add your AWS IPs
  if (currentHost === 'YOUR_PUBLIC_IP' || currentHost === 'YOUR_PRIVATE_IP') {
    return 'http://YOUR_PUBLIC_IP:5000/api';
  }
  
  // Keep existing ngrok logic
  if (currentHost.includes('ngrok-free.app') || 
      currentHost.includes('ngrok.io') || 
      currentHost.includes('ngrok.app')) {
    return `${window.location.protocol}//${currentHost}/api`;
  }
  
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
};
```

### Vite Config (frontend/vite.config.ts)
**Add your IPs to allowedHosts:**
```javascript
server: {
  port: 3000,
  host: '0.0.0.0',
  allowedHosts: [
    'localhost',
    '127.0.0.1',
    'YOUR_PUBLIC_IP',
    'YOUR_PRIVATE_IP',
    '.ngrok-free.app',
    '.ngrok.io',
    '.ngrok.app',
  ],
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
},
```

## 📋 Scripts Reference

### Create Admins
```bash
node script/create-admins.js
```
**Default Credentials:**
- Super Super Admin: `supersuperadmin@example.com` / `SuperSuperAdmin123!`
- Super Admin: `superadmin@example.com` / `SuperAdmin123!`

### Flush Database (WARNING: Deletes all data)
```bash
node script/flush-db.js
```

### Initialize File Storage Settings
```bash
node script/init-file-storage-settings.js
```

## 🔍 Verification Steps

### Check Services
```bash
# PM2 status
pm2 status

# Test backend
curl http://localhost:5000/health

# Test frontend
curl http://localhost:3000
```

### Check Logs
```bash
# Backend logs
pm2 logs repotrack-backend

# Frontend logs
pm2 logs repotrack-frontend
```

### Monitor Resources
```bash
# Memory and CPU
pm2 monit

# System resources
htop
```

## 🌐 Access URLs

### Local Access
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

### External Access
- Backend: `http://YOUR_PUBLIC_IP:5000`
- Frontend: `http://YOUR_PUBLIC_IP:3000`

## 🔒 Security Checklist

### AWS Security Groups
- **Backend Port**: 5000 (TCP)
- **Frontend Port**: 3000 (TCP)
- **SSH Port**: 22 (TCP)

### Firewall (if using UFW)
```bash
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw allow 5000
sudo ufw enable
```

## 🚨 Troubleshooting

### If Frontend Won't Start
```bash
# Check if build exists
ls -la frontend/dist/

# Rebuild if needed
cd frontend && npm run build && cd ..

# Start manually
pm2 start "serve -s frontend/dist -l 3000" --name repotrack-frontend
```

### If Backend Won't Start
```bash
# Check logs
pm2 logs repotrack-backend

# Check MongoDB connection
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
```

### If Memory Issues Persist
```bash
# Check current memory settings
pm2 show repotrack-backend

# Restart with memory optimization
./restart-with-memory-optimization.sh
```

## 📊 Performance Monitoring

### Memory Usage
```bash
# Check Node.js heap
pm2 show repotrack-backend | grep memory

# System memory
free -h
```

### Database Performance
```bash
# Check MongoDB connection
curl http://localhost:5000/health
```

## 🔄 Maintenance Commands

### Restart Services
```bash
pm2 restart all
```

### Update Application
```bash
git pull origin main
npm install
cd frontend && npm install && npm run build && cd ..
pm2 restart all
```

### Backup Database
```bash
# Export data (if needed)
mongodump --uri="YOUR_MONGODB_URI"
```

## ✅ Success Indicators

- ✅ Backend responds to `/health`
- ✅ Frontend loads without errors
- ✅ Admin login works
- ✅ Excel upload works with large files
- ✅ PM2 shows both services online
- ✅ Memory usage stays within limits

## 🎯 Quick Commands Summary

```bash
# Full setup after AWS wipe
git clone https://github.com/crvcrv26/repo.git && cd repo
npm install && cd frontend && npm install && npm run build && cd ..
node script/create-admins.js
node script/init-file-storage-settings.js
chmod +x restart-with-memory-optimization.sh
./restart-with-memory-optimization.sh
```

**Total setup time: ~15-20 minutes**
