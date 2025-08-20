import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { authAPI, otpAPI } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getAppDownloadUrl } from '../utils/config';
import { 
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ArrowLeftIcon,
  UserIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { 
  ChartBarIcon as ChartBarSolid 
} from '@heroicons/react/24/solid';

interface LoginForm {
  email: string;
  password: string;
}

interface OTPForm {
  otp: string;
}

interface PublicAppVersion {
  _id: string;
  appType: 'main' | 'emergency' | string;
  version: string;
  downloadCount?: number;
  description?: string;
  features?: string[];
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes

  // NEW: App versions state
  const [appsLoading, setAppsLoading] = useState(true);
  const [appVersions, setAppVersions] = useState<PublicAppVersion[]>([]);

  const { login, loginWithOTP } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>();

  const {
    register: registerOTP,
    handleSubmit: handleSubmitOTP,
    formState: { errors: otpErrors },
    reset: resetOTP
  } = useForm<OTPForm>();

  // OTP Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOTPForm && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOTPForm, otpTimer]);

  // NEW: Fetch public app versions
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/app-management/public/versions');
        if (mounted) setAppVersions(res.data?.data || []);
      } catch {
        toast.error('Failed to load app downloads');
      } finally {
        if (mounted) setAppsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const mainApp = appVersions.find(a => a.appType === 'main');
  const emergencyApp = appVersions.find(a => a.appType === 'emergency');

  const handleDownload = (appId: string) => {
    const downloadUrl = getAppDownloadUrl(appId);
    window.open(downloadUrl, '_blank');
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authAPI.login(data);
      
      if (response.data.requiresOTP) {
        setUserData(response.data.data.user);
        setShowOTPForm(true);
        setOtpTimer(300); // Reset timer
        toast.success('Please enter the OTP provided by your admin');
      } else {
        await login(data.email, data.password);
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOTP = async (data: OTPForm) => {
    if (!userData) return;
    
    setOtpLoading(true);
    try {
      const response = await otpAPI.verify(userData.email, data.otp);
      loginWithOTP(response.data.data.token, response.data.data.user);
      toast.success('OTP verified successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowOTPForm(false);
    setUserData(null);
    setOtpTimer(300);
    resetOTP();
  };

  if (showOTPForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="card-header text-center">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
                <KeyIcon className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Enter Verification Code</h2>
              <p className="text-gray-600 mt-2">
                We've sent a 4-digit code to your admin
              </p>
            </div>

            <div className="card-body">
              {userData && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{userData.name}</p>
                      <p className="text-sm text-gray-600">{userData.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{userData.role}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitOTP(onSubmitOTP)} className="space-y-6">
                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <div className="relative">
                    <input
                      {...registerOTP('otp', {
                        required: 'OTP is required',
                        pattern: {
                          value: /^[0-9]{4}$/,
                          message: 'OTP must be exactly 4 digits',
                        },
                      })}
                      type="text"
                      maxLength={4}
                      className="form-input text-center text-2xl font-mono tracking-[0.5em] pl-12"
                      placeholder="0000"
                      autoComplete="off"
                      autoFocus
                    />
                    <KeyIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                  {otpErrors.otp && (
                    <p className="text-red-600 text-sm mt-1">{otpErrors.otp.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Time remaining:</span>
                  <span className={`font-mono font-medium ${otpTimer < 60 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatTime(otpTimer)}
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={otpLoading || otpTimer === 0}
                    className="btn btn-primary btn-md w-full"
                  >
                    {otpLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    ) : (
                      <>
                        Verify Code
                        <CheckCircleIcon className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="btn btn-outline btn-md w-full"
                  >
                    <ArrowLeftIcon className="mr-2 h-5 w-5" />
                    Back to Login
                  </button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-2">Need help?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Contact your admin for a new OTP</li>
                  <li>• OTP expires in 5 minutes</li>
                  <li>• Each code can only be used once</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10"></div>
          <div className="relative z-10 flex flex-col justify-center p-12 text-white">
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                  <ChartBarSolid className="h-7 w-7 text-white" />
                </div>
                <span className="ml-4 text-2xl font-bold">RepoTrack</span>
              </div>
              
              <h1 className="text-4xl font-bold mb-4 leading-tight">
                Welcome to the Future of
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"> Vehicle Recovery</span>
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed">
                Secure, efficient, and comprehensive vehicle repossession management 
                for modern businesses.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-6 w-6 text-green-400 mr-3" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3" />
                <span>Real-time tracking & updates</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3" />
                <span>Advanced role management</span>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-900 to-transparent"></div>
        </div>

        {/* Right Side - Login Form + App Downloads */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                  <ChartBarSolid className="h-7 w-7 text-white" />
                </div>
                <span className="ml-3 text-2xl font-bold text-gray-900">RepoTrack</span>
              </div>
            </div>

            {/* Login Card */}
            <div className="card">
              <div className="card-header text-center">
                <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
                <p className="text-gray-600 mt-2">
                  Access your vehicle management dashboard
                </p>
              </div>

              <div className="card-body">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="relative">
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Please enter a valid email address',
                          },
                        })}
                        type="email"
                        className="form-input pl-12"
                        placeholder="Enter your email"
                        autoComplete="email"
                      />
                      <EnvelopeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="relative">
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                        type={showPassword ? 'text' : 'password'}
                        className="form-input pl-12 pr-12"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                      />
                      <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-md w-full"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-3">Access Levels</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Super Admin & Admin:</span>
                      <span className="font-medium text-blue-900">Direct access</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Field Agent & Auditor:</span>
                      <span className="font-medium text-blue-900">OTP required</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3">
                    Contact your administrator if you need an OTP code
                  </p>
                </div>
              </div>
            </div>

            {/* NEW: App Downloads (normal UI) */}
            <div className="mt-6 card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Download Mobile Apps</h3>
                </div>
              </div>
              <div className="card-body">
                {appsLoading ? (
                  <div className="space-y-3">
                    <div className="h-10 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : (mainApp || emergencyApp) ? (
                  <div className="space-y-3">
                    {mainApp && (
                      <button
                        onClick={() => handleDownload(mainApp._id)}
                        className="w-full inline-flex items-center justify-between px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-600 grid place-items-center">
                            <DevicePhoneMobileIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Main App</p>
                            <p className="text-xs text-gray-600">
                              v{mainApp.version} • {mainApp.downloadCount || 0} downloads
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center text-blue-700 font-medium">
                          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                          Download APK
                        </span>
                      </button>
                    )}

                    {emergencyApp && (
                      <button
                        onClick={() => handleDownload(emergencyApp._id)}
                        className="w-full inline-flex items-center justify-between px-4 py-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-red-600 grid place-items-center">
                            <DevicePhoneMobileIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Emergency App</p>
                            <p className="text-xs text-gray-600">
                              v{emergencyApp.version} • {emergencyApp.downloadCount || 0} downloads
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center text-red-700 font-medium">
                          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                          Download APK
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    No public builds available yet. Please check back soon.
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  Compatible with Android 6.0+. APKs are signed & verified.
                </div>
              </div>
            </div>

            {/* End downloads */}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
