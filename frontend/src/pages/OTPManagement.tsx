import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { otpAPI } from '../services/api'
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

interface OTPData {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  profileImage?: string
  hasValidOTP: boolean
  otp?: string
  expiresAt?: string
  createdAt?: string
  remainingSeconds?: number
  isExpired?: boolean
  message?: string
}

export default function OTPManagement() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Fetch OTP list for admin's users
  const { data: otpList, isLoading, error } = useQuery({
    queryKey: ['otp-list'],
    queryFn: () => otpAPI.list(),
    enabled: currentUser?.role === 'admin',
    refetchInterval: 5000, // Refresh every 5 seconds to update timers
  })

  // Generate OTP mutation
  const generateOTPMutation = useMutation({
    mutationFn: (userId: string) => otpAPI.generate(userId),
    onSuccess: (response) => {
      const { userName, otp } = response.data.data
      toast.success(`OTP generated for ${userName}: ${otp}`)
      queryClient.invalidateQueries({ queryKey: ['otp-list'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate OTP')
    }
  })

  // Invalidate OTP mutation
  const invalidateOTPMutation = useMutation({
    mutationFn: (userId: string) => otpAPI.invalidate(userId),
    onSuccess: (response) => {
      const { userName } = response.data.data
      toast.success(`OTP invalidated for ${userName}`)
      queryClient.invalidateQueries({ queryKey: ['otp-list'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to invalidate OTP')
    }
  })

  const otpData: OTPData[] = otpList?.data?.data || []

  // Format remaining time
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Expired'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get status icon
  const getStatusIcon = (otpData: OTPData) => {
    if (!otpData.hasValidOTP) {
      return <XCircleIcon className="h-5 w-5 text-gray-400" />
    }
    if (otpData.isExpired) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    }
    return <CheckCircleIcon className="h-5 w-5 text-green-500" />
  }

  // Get status color
  const getStatusColor = (otpData: OTPData) => {
    if (!otpData.hasValidOTP) {
      return 'bg-gray-100 text-gray-800'
    }
    if (otpData.isExpired) {
      return 'bg-red-100 text-red-800'
    }
    return 'bg-green-100 text-green-800'
  }

  // Get status text
  const getStatusText = (otpData: OTPData) => {
    if (!otpData.hasValidOTP) {
      return 'No OTP'
    }
    if (otpData.isExpired) {
      return 'Expired'
    }
    return 'Active'
  }

  const handleGenerateOTP = (userId: string) => {
    if (window.confirm('Generate new OTP for this user? This will invalidate any existing OTP.')) {
      generateOTPMutation.mutate(userId)
    }
  }

  const handleInvalidateOTP = (userId: string) => {
    if (window.confirm('Invalidate OTP for this user?')) {
      invalidateOTPMutation.mutate(userId)
    }
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Access Denied</h3>
          <p className="text-yellow-600">
            Only admins can access OTP management.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading OTP data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">
            Failed to load OTP data. Please try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OTP Management</h1>
          <p className="text-gray-600">Generate and manage OTPs for field agents and auditors</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <ClockIcon className="h-4 w-4" />
          <span>Auto-refresh every 5 seconds</span>
          <span>•</span>
          <span>Users sorted alphabetically</span>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-gray-400 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <KeyIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{otpData.length}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-2 border-gray-400 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {otpData.filter(user => user.hasValidOTP && !user.isExpired).length}
              </p>
              <p className="text-sm text-gray-600">Active OTPs</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-2 border-gray-400 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {otpData.filter(user => user.userRole === 'fieldAgent').length}
              </p>
              <p className="text-sm text-gray-600">Field Agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <KeyIcon className="h-6 w-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">How OTP System Works</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Generate 4-digit OTP for field agents and auditors</li>
              <li>• OTP is valid for 5 minutes and single-use only</li>
              <li>• Share OTP manually (phone/WhatsApp) with the user</li>
              <li>• User enters OTP during login to access the system</li>
            </ul>
          </div>
        </div>
      </div>

      {/* OTP List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {otpData.length === 0 ? (
            <div className="text-center py-12">
              <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any field agents or auditors under your supervision.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {otpData.map((otpData) => (
                <div key={otpData.userId} className="border-2 border-gray-400 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                                        <div className="flex items-center space-x-4">
                    {/* Profile Image */}
                    <div className="flex-shrink-0">
                      {otpData.profileImage ? (
                        <img
                          src={otpData.profileImage}
                          alt={otpData.userName}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center border-2 border-gray-200">
                          <span className="text-white font-semibold text-lg">
                            {otpData.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{otpData.userName}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          otpData.userRole === 'fieldAgent' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {otpData.userRole === 'fieldAgent' ? 'Field Agent' : 'Auditor'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{otpData.userEmail}</p>
                    </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(otpData)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(otpData)}`}>
                            {getStatusText(otpData)}
                          </span>
                        </div>

                        {otpData.hasValidOTP && !otpData.isExpired && (
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600 font-mono">
                              {formatTime(otpData.remainingSeconds || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* OTP Display */}
                      {otpData.hasValidOTP && !otpData.isExpired && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-900">Current OTP</p>
                              <p className="text-2xl font-bold text-green-800 font-mono tracking-wider">
                                {otpData.otp}
                              </p>
                            </div>
                            <div className="text-right text-xs text-green-600">
                              <p>Created: {new Date(otpData.createdAt || '').toLocaleTimeString()}</p>
                              <p>Expires: {new Date(otpData.expiresAt || '').toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {otpData.message && (
                        <p className="mt-2 text-sm text-gray-500">{otpData.message}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleGenerateOTP(otpData.userId)}
                        disabled={generateOTPMutation.isPending}
                        className="btn-primary"
                        title="Generate OTP"
                      >
                        {generateOTPMutation.isPending ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyIcon className="h-4 w-4" />
                        )}
                        Generate
                      </button>

                      {otpData.hasValidOTP && !otpData.isExpired && (
                        <button
                          onClick={() => handleInvalidateOTP(otpData.userId)}
                          disabled={invalidateOTPMutation.isPending}
                          className="btn-secondary"
                          title="Invalidate OTP"
                        >
                          {invalidateOTPMutation.isPending ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                          Invalidate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
              <div className="bg-gray-50 border-2 border-gray-400 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Instructions for Admins</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Click "Generate" to create a new 4-digit OTP for a user</li>
          <li>Share the OTP securely with the user (phone call, WhatsApp, etc.)</li>
          <li>OTP is valid for 5 minutes and can only be used once</li>
          <li>Use "Invalidate" to cancel an active OTP if needed</li>
          <li>Users will need this OTP to complete their login process</li>
        </ol>
      </div>
    </div>
  )
} 