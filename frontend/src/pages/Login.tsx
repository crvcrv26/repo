import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'
import { authAPI, otpAPI } from '../services/api'
import toast from 'react-hot-toast'
import { TruckIcon, KeyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

interface LoginForm {
  email: string
  password: string
}

interface OTPForm {
  otp: string
}

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [showOTPForm, setShowOTPForm] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const { login, loginWithOTP } = useAuth()
  const navigate = useNavigate()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginForm>()

  const {
    register: registerOTP,
    handleSubmit: handleSubmitOTP,
    formState: { errors: otpErrors },
    reset: resetOTP
  } = useForm<OTPForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const response = await authAPI.login(data)
      
      if (response.data.requiresOTP) {
        // User needs OTP verification
        setUserData(response.data.data.user)
        setShowOTPForm(true)
        toast.success('Please enter the OTP provided by your admin')
      } else {
        // Direct login for superAdmin and admin
        await login(data.email, data.password)
        toast.success('Login successful!')
        navigate('/dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitOTP = async (data: OTPForm) => {
    if (!userData) return
    
    setOtpLoading(true)
    try {
      const response = await otpAPI.verify(userData.email, data.otp)
      
      // Use the auth context method to handle OTP login
      loginWithOTP(response.data.data.token, response.data.data.user)
      
      toast.success('OTP verified successfully!')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowOTPForm(false)
    setUserData(null)
    resetOTP()
  }

  if (showOTPForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
              <KeyIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Enter OTP
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please enter the 4-digit OTP provided by your admin
            </p>
            {userData && (
              <p className="mt-1 text-center text-sm text-gray-500">
                Logging in as: {userData.name} ({userData.email})
              </p>
            )}
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmitOTP(onSubmitOTP)}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                4-Digit OTP
              </label>
              <input
                {...registerOTP('otp', {
                  required: 'OTP is required',
                  pattern: {
                    value: /^[0-9]{4}$/,
                    message: 'OTP must be exactly 4 digits',
                  },
                })}
                id="otp"
                name="otp"
                type="text"
                maxLength={4}
                className="input text-center text-2xl font-mono tracking-widest"
                placeholder="0000"
                autoComplete="off"
                autoFocus
              />
              {otpErrors.otp && (
                <p className="mt-1 text-sm text-red-600">{otpErrors.otp.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={otpLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {otpLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Login
              </button>
            </div>
          </form>

          {/* OTP Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Need OTP?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Contact your admin to generate an OTP</li>
              <li>• OTP is valid for 5 minutes only</li>
              <li>• OTP can only be used once</li>
              <li>• Enter the 4-digit code exactly as provided</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <TruckIcon className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Vehicle Repossession Management System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="input rounded-t-md"
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="input rounded-b-md"
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Login Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Login Information</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Super Admin & Admin:</strong> Direct login</li>
              <li>• <strong>Field Agent & Auditor:</strong> Requires OTP from admin</li>
              <li>• Contact your admin if you need an OTP</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  )
} 