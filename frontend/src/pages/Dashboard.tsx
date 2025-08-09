import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { 
  UsersIcon, 
  TruckIcon, 
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  UserIcon,
  UserGroupIcon,
  TrashIcon,
  KeyIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface User {
  _id: string
  name: string
  email: string
  role: 'superSuperAdmin' | 'superAdmin' | 'admin' | 'fieldAgent' | 'auditor'
  isActive: boolean
  location: {
    city: string
    state: string
  }
  createdBy?: {
    _id: string
    name: string
    email: string
  }
}



export default function Dashboard() {
  const { user: currentUser } = useAuth()
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Fetch data based on user role
  const { data: usersData } = useQuery({
    queryKey: ['users', currentUser?.role],
    queryFn: () => usersAPI.getAll({ limit: 100 }),
    enabled: !!currentUser
  })



  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => usersAPI.getStats(),
    enabled: !!currentUser
  })

  const users = usersData?.data?.data || []
  const stats = statsData?.data?.data || {}

  // Filter users based on role
  const getFilteredUsers = () => {
    if (!currentUser) return []
    
    switch (currentUser.role) {
      case 'superSuperAdmin':
        return users
      case 'superAdmin':
        return users
      case 'admin':
        return users.filter((user: User) => user.createdBy?._id === currentUser._id)
      case 'auditor':
        // Auditor sees field agents under their admin
        const adminUsers = users.filter((user: User) => 
          user.createdBy?._id === currentUser.createdBy?._id && user.role === 'fieldAgent'
        )
        return adminUsers
      case 'fieldAgent':
        return [] // Field agents don't see users
      default:
        return []
    }
  }

  const filteredUsers = getFilteredUsers()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      // Call API to update password
      await usersAPI.updatePassword(selectedUser!._id, {
        newPassword: passwordForm.newPassword
      })
      toast.success('Password updated successfully')
      setShowUpdatePasswordModal(false)
      setSelectedUser(null)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      await usersAPI.delete(userId)
      toast.success('User deleted successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superSuperAdmin': return 'bg-orange-100 text-orange-800'
      case 'superAdmin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'fieldAgent': return 'bg-green-100 text-green-800'
      case 'auditor': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superSuperAdmin': return ShieldCheckIcon
      case 'superAdmin': return ShieldCheckIcon
      case 'admin': return UserIcon
      case 'fieldAgent': return UserGroupIcon
      case 'auditor': return UserIcon
      default: return UserIcon
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              {currentUser.role === 'superSuperAdmin' && 'Super Super Administrator Dashboard'}
              {currentUser.role === 'superAdmin' && 'Super Administrator Dashboard'}
              {currentUser.role === 'admin' && 'Admin Dashboard'}
              {currentUser.role === 'fieldAgent' && 'Field Agent Dashboard'}
              {currentUser.role === 'auditor' && 'Auditor Dashboard'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleColor(currentUser.role)}`}>
              {currentUser.role.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Vehicles</p>
                <p className="text-2xl font-semibold text-gray-900">
                  0
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">
                  0
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Section */}
      {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin' || currentUser.role === 'admin' || currentUser.role === 'auditor') && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin') && 'All Users'}
                  {currentUser.role === 'admin' && 'My Team'}
                  {currentUser.role === 'auditor' && 'Field Agents'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin') && 'Manage all system users'}
                  {currentUser.role === 'admin' && 'Manage your field agents and auditors'}
                  {currentUser.role === 'auditor' && 'View field agents under your admin'}
                </p>
              </div>
              {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin' || currentUser.role === 'admin') && (
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add User
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user: User) => {
                  const RoleIcon = getRoleIcon(user.role)
                  return (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <RoleIcon className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.location.city}, {user.location.state}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setShowUpdatePasswordModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Update Password"
                          >
                            <KeyIcon className="h-4 w-4" />
                          </button>
                          
                          {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin') && (
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete User"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin') && 'Get started by creating a new user.'}
                  {currentUser.role === 'admin' && 'Start building your team by adding field agents and auditors.'}
                  {currentUser.role === 'auditor' && 'No field agents are currently assigned to your admin.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Field Agent Dashboard - No User Management */}
      {currentUser.role === 'fieldAgent' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Field Agent Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">
              You can view and manage users and Excel files assigned to you.
            </p>
          </div>
        </div>
      )}

      {/* Update Password Modal */}
      {showUpdatePasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Update Password for {selectedUser.name}
                </h3>
                <button
                  onClick={() => {
                    setShowUpdatePasswordModal(false)
                    setSelectedUser(null)
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="input w-full"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="input w-full"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdatePasswordModal(false)
                      setSelectedUser(null)
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal - Redirect to Users page */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <UsersIcon className="mx-auto h-12 w-12 text-blue-600" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Create New User</h3>
              <p className="mt-1 text-sm text-gray-500">
                Redirecting to the Users page for better user management experience.
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false)
                    window.location.href = '/users'
                  }}
                  className="btn-primary"
                >
                  Go to Users Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 