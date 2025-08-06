import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import ExcelFiles from './pages/ExcelFiles'
import VehicleSearch from './pages/VehicleSearch'
import Vehicles from './pages/Vehicles'
import Tasks from './pages/Tasks'
import Proofs from './pages/Proofs'
import Upload from './pages/Upload'
import Profile from './pages/Profile'
import OTPManagement from './pages/OTPManagement'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/excel-files" element={<ExcelFiles />} />
        <Route path="/vehicle-search" element={<VehicleSearch />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/proofs" element={<Proofs />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/otp-management" element={<OTPManagement />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App 