import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import ProfileImage from '../components/ProfileImage';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ShieldCheckIcon,
  KeyIcon,
  PencilIcon,
  CameraIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

interface ProfileDetails {
  user: any;
  roleSpecificInfo: any;
  recentLogins: any[];
}

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.location?.city || '',
    state: user?.location?.state || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch detailed profile information
  const { data: profileDetails, isLoading } = useQuery<ProfileDetails>({
    queryKey: ['profileDetails'],
    queryFn: () => authAPI.getProfileDetails().then(res => res.data.data),
    enabled: !!user
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authAPI.updateProfile(data),
    onSuccess: (response) => {
      updateProfile(response.data.data);
      queryClient.invalidateQueries({ queryKey: ['profileDetails'] });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authAPI.changePassword(data),
    onSuccess: () => {
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  });

  // Upload profile image mutation
  const uploadImageMutation = useMutation({
    mutationFn: (formData: FormData) => authAPI.uploadProfileImage(formData),
    onSuccess: (response) => {
      updateProfile(response.data.data.user);
      queryClient.invalidateQueries({ queryKey: ['profileDetails'] });
      setIsUploadingImage(false);
      toast.success('Profile image uploaded successfully');
    },
    onError: (error: any) => {
      setIsUploadingImage(false);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    }
  });

  // Remove profile image mutation
  const removeImageMutation = useMutation({
    mutationFn: () => authAPI.removeProfileImage(),
    onSuccess: (response) => {
      updateProfile(response.data.data);
      queryClient.invalidateQueries({ queryKey: ['profileDetails'] });
      toast.success('Profile image removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove image');
    }
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        city: user.location?.city || '',
        state: user.location?.state || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: formData.name,
      location: {
        city: formData.city,
        state: formData.state
      }
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('profileImage', file);
    uploadImageMutation.mutate(formData);
  };

  const handleRemoveImage = () => {
    if (confirm('Are you sure you want to remove your profile image?')) {
      removeImageMutation.mutate();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superSuperAdmin': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'superAdmin': return 'bg-gradient-to-r from-pink-500 to-red-500 text-white';
      case 'admin': return 'bg-gradient-to-r from-blue-500 to-purple-600 text-white';
      case 'fieldAgent': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
      case 'auditor': return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superSuperAdmin': return ShieldCheckIcon;
      case 'superAdmin': return ShieldCheckIcon;
      case 'admin': return UserIcon;
      case 'fieldAgent': return UserIcon;
      case 'auditor': return UserIcon;
      default: return UserIcon;
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account information and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="relative inline-block">
                <ProfileImage 
                  user={user} 
                  size="xl" 
                  showBorder={true}
                  className="mx-auto"
                />
                
                {/* Image Upload Controls */}
                <div className="mt-4 space-y-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                    <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 hover:text-blue-800">
                      <CameraIcon className="h-4 w-4" />
                      <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    </div>
                  </label>
                  
                  {user.profileImage && (
                    <button
                      onClick={handleRemoveImage}
                      disabled={removeImageMutation.isLoading}
                      className="flex items-center justify-center space-x-2 text-sm text-red-600 hover:text-red-800 mx-auto"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span>{removeImageMutation.isLoading ? 'Removing...' : 'Remove Image'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {user.role.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Profile Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b-2 border-gray-400">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-900"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="input bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        disabled
                        className="input bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Phone cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isLoading}
                      className="btn-primary"
                    >
                      {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-sm text-gray-900">{user.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-sm text-gray-900">{user.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Location</p>
                        <p className="text-sm text-gray-900">
                          {user.location.city}, {user.location.state}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b-2 border-gray-400">
              <h3 className="text-lg font-medium text-gray-900">Account Details</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Member Since</p>
                    <p className="text-sm text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Login</p>
                    <p className="text-sm text-gray-900">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Account Status</p>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {profileDetails?.roleSpecificInfo?.paymentRates && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payment Rate</p>
                      <p className="text-sm text-gray-900">
                        ₹{user.role === 'auditor' 
                          ? profileDetails.roleSpecificInfo.paymentRates.auditorRate 
                          : profileDetails.roleSpecificInfo.paymentRates.fieldAgentRate
                        } per vehicle
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Login History */}
              {profileDetails?.recentLogins && profileDetails.recentLogins.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Login History</h4>
                  <div className="space-y-2">
                    {profileDetails.recentLogins.slice(0, 3).map((login, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {new Date(login.timestamp).toLocaleString()}
                        </span>
                        {login.ip && (
                          <span className="text-gray-500 text-xs">IP: {login.ip}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b-2 border-gray-400">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                <button
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-900"
                >
                  <KeyIcon className="h-4 w-4 mr-1" />
                  {isChangingPassword ? 'Cancel' : 'Change'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {isChangingPassword ? (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="input"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isLoading}
                      className="btn-primary"
                    >
                      {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-gray-600">
                  Click "Change" to update your password. Make sure to use a strong password with at least 6 characters.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 