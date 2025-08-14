import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersAPI, excelAPI, notificationsAPI, paymentsAPI, moneyAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { 
  UsersIcon, 
  DocumentTextIcon, 
  BellIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  UserIcon,
  UserGroupIcon,
  TrashIcon,
  KeyIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'

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

  // Fetch Excel files data
  const { data: excelData } = useQuery({
    queryKey: ['excel-files'],
    queryFn: () => excelAPI.getFiles({ limit: 100 }),
    enabled: !!currentUser
  })

  // Fetch notifications data
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 50 }),
    enabled: !!currentUser
  })

  // Fetch money records data
  const { data: moneyData } = useQuery({
    queryKey: ['money-records'],
    queryFn: () => moneyAPI.getAll({ limit: 100 }),
    enabled: !!currentUser
  })

  // Fetch payment summary data (for admins and above)
  const { data: paymentData } = useQuery({
    queryKey: ['payment-summary'],
    queryFn: () => paymentsAPI.getAdminSummary(),
    enabled: !!currentUser && ['superSuperAdmin', 'superAdmin', 'admin'].includes(currentUser.role)
  })

  const users = usersData?.data?.data || []
  const stats = statsData?.data?.data || {}
  const excelFiles = excelData?.data?.data || []
  const notifications = notificationsData?.data?.data || []
  const moneyRecords = moneyData?.data?.data || []
  const paymentSummary = paymentData?.data?.data || {}

  // Calculate dashboard metrics
  const dashboardMetrics = {
    totalUsers: stats.total || 0,
    activeUsers: stats.active || 0,
    totalExcelFiles: excelFiles.length,
    totalNotifications: notifications.length,
    unreadNotifications: notifications.filter((n: any) => !n.isRead).length,
    totalMoneyRecords: moneyRecords.length,
    totalAmount: moneyRecords.reduce((sum: number, record: any) => sum + (record.amount || 0), 0),
    pendingPayments: paymentSummary.pendingPayments || 0,
    completedPayments: paymentSummary.completedPayments || 0,
    totalPayments: (paymentSummary.pendingPayments || 0) + (paymentSummary.completedPayments || 0)
  }

  // Get recent activity
  const recentActivity = [
    ...excelFiles.slice(0, 3).map((file: any) => ({
      type: 'file',
      title: `Excel file uploaded: ${file.originalName}`,
      time: new Date(file.createdAt).toLocaleDateString(),
      icon: DocumentTextIcon,
      color: 'text-blue-600'
    })),
    ...notifications.slice(0, 3).map((notif: any) => ({
      type: 'notification',
      title: `Vehicle ${notif.vehicleNumber} ${notif.action}`,
      time: new Date(notif.createdAt).toLocaleDateString(),
      icon: BellIcon,
      color: 'text-purple-600'
    })),
    ...moneyRecords.slice(0, 3).map((record: any) => ({
      type: 'money',
      title: `Money record: ₹${record.amount} for ${record.vehicleNumber}`,
      time: new Date(record.createdAt).toLocaleDateString(),
      icon: CurrencyDollarIcon,
      color: 'text-green-600'
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5)

  // Filter users based on role
  const getFilteredUsers = () => {
    if (!currentUser) return []
    
    switch (currentUser.role) {
      case 'superSuperAdmin':
        return users
      case 'superAdmin':
        // Super Admin can see all users except Super Super Admin
        return users.filter((user: User) => user.role !== 'superSuperAdmin')
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

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'superSuperAdmin': return 'warning'
      case 'superAdmin': return 'danger'
      case 'admin': return 'info'
      case 'fieldAgent': return 'success'
      case 'auditor': return 'secondary'
      default: return 'primary'
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
    <div className="space-y-6 container-responsive">
      {/* Welcome Header */}
      <Card className="fade-in">
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient">
                Welcome back, {currentUser.name}!
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {currentUser.role === 'superSuperAdmin' && 'Super Super Administrator Dashboard'}
                {currentUser.role === 'superAdmin' && 'Super Administrator Dashboard'}
                {currentUser.role === 'admin' && 'Admin Dashboard'}
                {currentUser.role === 'fieldAgent' && 'Field Agent Dashboard'}
                {currentUser.role === 'auditor' && 'Auditor Dashboard'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full shadow-sm ${
                currentUser.role === 'superSuperAdmin' ? 'bg-orange-100 text-orange-800' :
                currentUser.role === 'superAdmin' ? 'bg-red-100 text-red-800' :
                currentUser.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                currentUser.role === 'fieldAgent' ? 'bg-green-100 text-green-800' :
                currentUser.role === 'auditor' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentUser.role.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Enhanced Statistics Cards */}
      {!statsLoading && (
        <div className="grid-responsive slide-up">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <UsersIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardMetrics.totalUsers}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {dashboardMetrics.activeUsers} active now
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <DocumentTextIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Excel Files</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardMetrics.totalExcelFiles}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Files uploaded
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <BellIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Notifications</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardMetrics.totalNotifications}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    {dashboardMetrics.unreadNotifications} unread
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Money Records</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardMetrics.totalMoneyRecords}</p>
                  <p className="text-xs text-green-600 mt-1">
                    ₹{dashboardMetrics.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Payment Summary Cards (for admins and above) */}
      {!statsLoading && ['superSuperAdmin', 'superAdmin', 'admin'].includes(currentUser.role) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 slide-up">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ClockIcon className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.pendingPayments}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.completedPayments}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.totalPayments}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Quick Actions Section */}
      <Card className="mt-6 fade-in">
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-500 mt-1">Common tasks and shortcuts</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.href = '/excel-files'}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <DocumentTextIcon className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Excel Files</span>
              <span className="text-xs text-gray-500">Manage files</span>
            </button>

            <button
              onClick={() => window.location.href = '/notifications'}
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <BellIcon className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Notifications</span>
              <span className="text-xs text-gray-500">View alerts</span>
            </button>

            <button
              onClick={() => window.location.href = '/money-management'}
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CurrencyDollarIcon className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Money Records</span>
              <span className="text-xs text-gray-500">Manage finances</span>
            </button>

            <button
              onClick={() => window.location.href = '/payments'}
              className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <ChartBarIcon className="h-8 w-8 text-yellow-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Payments</span>
              <span className="text-xs text-gray-500">View payments</span>
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Recent Activity Section */}
      <Card className="mt-6 fade-in">
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500 mt-1">Latest system activities and updates</p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`p-2 rounded-full bg-white shadow-sm`}>
                      <Icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* User Management Section */}
      {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin' || currentUser.role === 'admin' || currentUser.role === 'auditor') && (
        <Card className="fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
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
                  className="btn btn-primary btn-md"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add User
                </button>
              )}
            </div>
          </CardHeader>

          <CardBody>
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredUsers.map((user: User) => {
                    const RoleIcon = getRoleIcon(user.role)
                    return (
                      <tr key={user._id} className="table-row">
                        <td className="table-cell">
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
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'superSuperAdmin' ? 'bg-orange-100 text-orange-800' :
                            user.role === 'superAdmin' ? 'bg-red-100 text-red-800' :
                            user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'fieldAgent' ? 'bg-green-100 text-green-800' :
                            user.role === 'auditor' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </td>
                        <td className="table-cell">
                          {user.location.city}, {user.location.state}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setShowUpdatePasswordModal(true)
                              }}
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Update Password"
                            >
                              <KeyIcon className="h-4 w-4" />
                            </button>
                            
                            {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin') && (
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
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
                <div className="text-center py-12">
                  <UsersIcon className="mx-auto h-16 w-16 text-gray-300" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
                  <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                    {(currentUser.role === 'superSuperAdmin' || currentUser.role === 'superAdmin') && 'Get started by creating a new user.'}
                    {currentUser.role === 'admin' && 'Start building your team by adding field agents and auditors.'}
                    {currentUser.role === 'auditor' && 'No field agents are currently assigned to your admin.'}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Field Agent Dashboard - No User Management */}
      {currentUser.role === 'fieldAgent' && (
        <Card className="fade-in">
          <CardBody>
            <div className="text-center py-12">
              <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <UserGroupIcon className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Field Agent Dashboard</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                You can view and manage users and Excel files assigned to you.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Update Password Modal */}
      <Modal
        isOpen={showUpdatePasswordModal}
        onClose={() => {
          setShowUpdatePasswordModal(false)
          setSelectedUser(null)
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        }}
        title={selectedUser ? `Update Password for ${selectedUser.name}` : 'Update Password'}
        size="md"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <Input
            type="password"
            label="New Password"
            required
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
            placeholder="Enter new password"
            minLength={6}
          />
          
          <Input
            type="password"
            label="Confirm Password"
            required
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
            placeholder="Confirm new password"
            minLength={6}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowUpdatePasswordModal(false)
                setSelectedUser(null)
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
              }}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-md">
              Update Password
            </button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal - Redirect to Users page */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        title="Create New User"
        size="md"
      >
        <div className="text-center space-y-6">
          <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <UsersIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
            <p className="text-sm text-gray-500 mt-2">
              Redirecting to the Users page for better user management experience.
            </p>
          </div>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowCreateUserModal(false)
                window.location.href = '/users'
              }}
              className="btn btn-primary btn-md"
            >
              Go to Users Page
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 