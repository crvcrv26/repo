import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

interface User {
  _id: string
  name: string
  email: string
  phone: string
  role: 'superSuperAdmin' | 'superAdmin' | 'admin' | 'fieldAgent' | 'auditor'
  isActive: boolean
  isOnline: boolean
  lastSeen: string
  location: {
    city: string
    state: string
  }
  createdBy?: {
    _id: string
    name: string
    email: string
  }
  createdAt: string
}

interface CreateUserForm {
  name: string
  email: string
  phone: string
  password: string
  role: 'superSuperAdmin' | 'superAdmin' | 'admin' | 'fieldAgent' | 'auditor'
  assignedTo?: string // Admin ID for field agents and auditors
  location: {
    city: string
    state: string
  }
}



export default function Users() {
  const { user: currentUser, logout } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // State for filters and pagination
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('') // Show all users by default (including inactive)
  const [city, setCity] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page when search changes
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [search])
  
  // Reset page when other filters change
  useEffect(() => {
    setPage(1)
  }, [role, status, city])
  
  // State for modal and form
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedAdmins, setExpandedAdmins] = useState<Set<string>>(new Set())
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'fieldAgent',
    assignedTo: '',
    location: {
      city: '',
      state: ''
    }
  })

  // Fetch users with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', { search: debouncedSearch, role, status, city, page, currentUser: currentUser?.role, currentUserId: currentUser?._id, currentUserCreatedBy: currentUser?.createdBy?._id }],
    queryFn: () => usersAPI.getAll({ search: debouncedSearch, role, status, city, page, limit: 50 }),
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  })

  // Fetch admins for assignment (only for super admin and super super admin)
  const { data: adminsData, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ['admins'],
    queryFn: () => usersAPI.getAll({ role: 'admin', status: 'active' }),
    enabled: (currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin') && showCreateModal,
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.delete(userId)
  })

  const createMutation = useMutation({
    mutationFn: (userData: CreateUserForm) => {
      // Only send assignedTo if super admin or super super admin is creating field agent or auditor
      if ((currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin') && (userData.role === 'fieldAgent' || userData.role === 'auditor')) {
        return usersAPI.create({
          ...userData,
          assignedTo: userData.assignedTo
        })
      }
      // For admin users, don't send assignedTo - it will be automatically set
      return usersAPI.create(userData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      setShowCreateModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user')
    }
  })

  const statusUpdateMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => 
      usersAPI.updateStatus(userId, { isActive }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(data.data.message)
      
      // Check if current user was deactivated
      if (!variables.isActive && currentUser && variables.userId === currentUser._id) {
        toast.error('Your account has been deactivated. You will be logged out.')
        setTimeout(() => {
          logout()
          navigate('/login')
        }, 2000)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user status')
    }
  })

  const users = data?.data?.data || []
  const admins = adminsData?.data?.data || []
  
  // Check if search is in progress (debounced search differs from current search)
  const isSearching = search !== debouncedSearch
  


  const handleDelete = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      console.log('Deleting user:', userId)
      deleteMutation.mutate(userId, {
        onSuccess: (data) => {
          console.log('Delete success:', data)
          queryClient.invalidateQueries({ queryKey: ['users'] })
          toast.success('User deleted successfully')
        },
        onError: (error: any) => {
          console.error('Delete error:', error)
          toast.error(error.response?.data?.message || 'Failed to delete user')
        }
      })
    }
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate admin assignment for field agents and auditors (only for super admin and super super admin)
    if ((createForm.role === 'fieldAgent' || createForm.role === 'auditor') && (currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin')) {
      if (!createForm.assignedTo) {
        toast.error('Please select an admin to assign this user to')
        return
      }
      if (admins.length === 0) {
        toast.error('No active admins available. Please create an admin first.')
        return
      }
    }
    
    createMutation.mutate(createForm)
  }

  const resetForm = () => {
    setCreateForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'fieldAgent',
      assignedTo: '',
      location: {
        city: '',
        state: ''
      }
    })
  }

  const toggleAdminExpansion = (adminId: string) => {
    const newExpanded = new Set(expandedAdmins)
    if (newExpanded.has(adminId)) {
      newExpanded.delete(adminId)
    } else {
      newExpanded.add(adminId)
    }
    setExpandedAdmins(newExpanded)
  }

  const handleStatusToggle = (user: User) => {
    if (user.role === 'superSuperAdmin') {
      toast.error('SuperSuperAdmin cannot be deactivated')
      return
    }
    
    const confirmMessage = user.isActive 
      ? `Are you sure you want to deactivate ${user.name}? ${user.role === 'admin' ? 'This will also deactivate all their associated users.' : ''}`
      : `Are you sure you want to activate ${user.name}?`
    
    if (window.confirm(confirmMessage)) {
      statusUpdateMutation.mutate({ 
        userId: user._id, 
        isActive: !user.isActive 
      })
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
      case 'auditor': return DocumentTextIcon
      default: return UserIcon
    }
  }

  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin'
  // Admin can delete their own field agents and auditors, super admins can delete anyone except protected roles
  const canDelete = (user: User) => {
    // Never allow deletion of superSuperAdmin or superAdmin
    if (user.role === 'superSuperAdmin' || user.role === 'superAdmin') {
      return false
    }
    
    if (currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin') {
      return true // Can delete anyone except superSuperAdmin and superAdmin
    }
    if (currentUser?.role === 'admin') {
      // Can only delete field agents and auditors they created
      return (user.role === 'fieldAgent' || user.role === 'auditor') && 
             user.createdBy && user.createdBy._id === currentUser._id
    }
    return false
  }
  const canCreateAdmins = currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin'

  // Filter users based on current user role
  const getFilteredUsers = () => {
    if (!currentUser) return { superSuperAdmins: [], superAdmins: [], adminUsers: [], fieldAgents: [], auditors: [] }
    
    switch (currentUser.role) {
      case 'superSuperAdmin':
        return {
          superSuperAdmins: users.filter((user: User) => user.role === 'superSuperAdmin'),
          superAdmins: users.filter((user: User) => user.role === 'superAdmin'),
          adminUsers: users.filter((user: User) => user.role === 'admin'),
          fieldAgents: users.filter((user: User) => user.role === 'fieldAgent'),
          auditors: users.filter((user: User) => user.role === 'auditor')
        }
      case 'superAdmin':
        return {
          superSuperAdmins: [],
          superAdmins: users.filter((user: User) => user.role === 'superAdmin'),
          adminUsers: users.filter((user: User) => user.role === 'admin'),
          fieldAgents: users.filter((user: User) => user.role === 'fieldAgent'),
          auditors: users.filter((user: User) => user.role === 'auditor')
        }
      case 'admin':
        return {
          superSuperAdmins: [],
          superAdmins: [],
          adminUsers: [],
          fieldAgents: users.filter((user: User) => user.role === 'fieldAgent' && user.createdBy && user.createdBy._id === currentUser._id),
          auditors: users.filter((user: User) => user.role === 'auditor' && user.createdBy && user.createdBy._id === currentUser._id)
        }
      case 'auditor':
        return {
          superSuperAdmins: [],
          superAdmins: [],
          adminUsers: [],
          fieldAgents: users.filter((user: User) => user.role === 'fieldAgent'),
          auditors: []
        }
      default:
        return { superSuperAdmins: [], superAdmins: [], adminUsers: [], fieldAgents: [], auditors: [] }
    }
  }

  const { superSuperAdmins, superAdmins, adminUsers, fieldAgents, auditors } = getFilteredUsers()

  // Group field agents and auditors by their admin
  const getUsersByAdmin = (adminId: string) => {
    return {
      fieldAgents: fieldAgents.filter((user: User) => user.createdBy && user.createdBy._id === adminId),
      auditors: auditors.filter((user: User) => user.createdBy && user.createdBy._id === adminId)
    }
  }

  // UserCard component for displaying user information
  interface UserCardProps {
    user: User
    compact?: boolean
  }

  const UserCard: React.FC<UserCardProps> = ({ user, compact = false }) => {
    const RoleIcon = getRoleIcon(user.role)
    
    if (compact) {
      return (
        <div className="flex items-center justify-between p-2 bg-white rounded border">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 relative">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <RoleIcon className="h-4 w-4 text-gray-600" />
              </div>
              {/* Online status indicator */}
              <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                user.isOnline ? 'bg-green-500' : 'bg-red-500'
              }`} title={user.isOnline ? 'Online' : 'Offline'} />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
              {user.role.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user.isActive ? 'Active' : 'Deactive'}
            </span>
                      {/* Status toggle for superSuperAdmin only */}
          {currentUser?.role === 'superSuperAdmin' && user.role !== 'superSuperAdmin' && (
            <button
              onClick={() => handleStatusToggle(user)}
              disabled={statusUpdateMutation.isPending}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                user.isActive 
                  ? 'bg-green-600' 
                  : 'bg-gray-200'
              } disabled:opacity-50`}
              title={user.isActive ? 'Deactivate user' : 'Activate user'}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                user.isActive ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          )}
            {canDelete(user) && (
              <button
                onClick={() => handleDelete(user._id)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Delete user"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 relative">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <RoleIcon className="h-5 w-5 text-gray-600" />
            </div>
            {/* Online status indicator */}
            <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
              user.isOnline ? 'bg-green-500' : 'bg-red-500'
            }`} title={user.isOnline ? 'Online' : 'Offline'} />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="text-sm text-gray-500">{user.location.city}, {user.location.state}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
            {user.role.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {user.isActive ? 'Active' : 'Deactive'}
          </span>
          {/* Status toggle for superSuperAdmin only */}
          {currentUser?.role === 'superSuperAdmin' && user.role !== 'superSuperAdmin' && (
            <button
              onClick={() => handleStatusToggle(user)}
              disabled={statusUpdateMutation.isPending}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                user.isActive 
                  ? 'bg-green-600' 
                  : 'bg-gray-200'
              } disabled:opacity-50`}
              title={user.isActive ? 'Deactivate user' : 'Activate user'}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                user.isActive ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          )}
          {canDelete(user) && (
            <button
              onClick={() => handleDelete(user._id)}
              className="text-red-600 hover:text-red-800 p-1"
              title="Delete user"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load users</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage system users and their roles</p>
        </div>
        {canManageUsers && (
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-5 w-5" />
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <FunnelIcon className="h-4 w-4 mr-1" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-10"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input"
                >
                  <option value="">All Roles</option>
                  <option value="superSuperAdmin">Super Super Admin</option>
                  <option value="superAdmin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="fieldAgent">Field Agent</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Deactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  placeholder="Enter city..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role-Based User View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {(currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin') && 'All Users'}
            {currentUser?.role === 'admin' && 'My Team'}
            {currentUser?.role === 'auditor' && 'Field Agents'}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {/* Super Admin and Super Super Admin View - Show all users */}
          {(currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin') && (
            <>
              {/* Super Super Admins */}
              {superSuperAdmins.length > 0 && (
                <div className="p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 mr-2 text-orange-600" />
                    Super Super Admins ({superSuperAdmins.length})
                  </h4>
                  <div className="space-y-2">
                    {superSuperAdmins.map((user: User) => (
                      <UserCard key={user._id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {/* Super Admins */}
              {superAdmins.length > 0 && (
                <div className="p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 mr-2 text-red-600" />
                    Super Admins ({superAdmins.length})
                  </h4>
                  <div className="space-y-2">
                    {superAdmins.map((user: User) => (
                      <UserCard key={user._id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {/* Admins with their field agents and auditors */}
              {adminUsers.length > 0 && (
                <div className="p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Admins ({adminUsers.length})
                  </h4>
                  <div className="space-y-4">
                    {adminUsers.map((admin: User) => {
                      const adminUsers = getUsersByAdmin(admin._id)
                      const isExpanded = expandedAdmins.has(admin._id)
                      
                      return (
                        <div key={admin._id} className="border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between p-3 bg-blue-50">
                            <div className="flex items-center">
                              <button
                                onClick={() => toggleAdminExpansion(admin._id)}
                                className="mr-2 text-gray-500 hover:text-gray-700"
                              >
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4" />
                                )}
                              </button>
                              <UserCard user={admin} />
                            </div>
                            <div className="text-xs text-gray-500">
                              {adminUsers.fieldAgents.length} Field Agents, {adminUsers.auditors.length} Auditors
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-4 bg-gray-50">
                              {/* Field Agents */}
                              {adminUsers.fieldAgents.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                    <UserGroupIcon className="h-4 w-4 mr-1 text-green-600" />
                                    Field Agents ({adminUsers.fieldAgents.length})
                                  </h5>
                                  <div className="space-y-2">
                                    {adminUsers.fieldAgents.map((user: User) => (
                                      <UserCard key={user._id} user={user} compact />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Auditors */}
                              {adminUsers.auditors.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                    <DocumentTextIcon className="h-4 w-4 mr-1 text-purple-600" />
                                    Auditors ({adminUsers.auditors.length})
                                  </h5>
                                  <div className="space-y-2">
                                    {adminUsers.auditors.map((user: User) => (
                                      <UserCard key={user._id} user={user} compact />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {adminUsers.fieldAgents.length === 0 && adminUsers.auditors.length === 0 && (
                                <div className="text-center py-4 text-gray-500">
                                  No field agents or auditors assigned to this admin yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Orphaned Field Agents and Auditors */}
              {fieldAgents.filter((user: User) => !user.createdBy).length > 0 && (
                <div className="p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <UserGroupIcon className="h-5 w-5 mr-2 text-green-600" />
                    Field Agents (Unassigned) ({fieldAgents.filter((user: User) => !user.createdBy).length})
                  </h4>
                  <div className="space-y-2">
                    {fieldAgents.filter((user: User) => !user.createdBy).map((user: User) => (
                      <UserCard key={user._id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {auditors.filter((user: User) => !user.createdBy).length > 0 && (
                <div className="p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
                    Auditors (Unassigned) ({auditors.filter((user: User) => !user.createdBy).length})
                  </h4>
                  <div className="space-y-2">
                    {auditors.filter((user: User) => !user.createdBy).map((user: User) => (
                      <UserCard key={user._id} user={user} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Admin View - Show their team */}
          {currentUser?.role === 'admin' && (
            <div className="p-4">
              <div className="space-y-4">
                {/* Field Agents */}
                {fieldAgents.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                      <UserGroupIcon className="h-5 w-5 mr-2 text-green-600" />
                      Field Agents ({fieldAgents.length})
                    </h4>
                    <div className="space-y-2">
                      {fieldAgents.map((user: User) => (
                        <UserCard key={user._id} user={user} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Auditors */}
                {auditors.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
                      Auditors ({auditors.length})
                    </h4>
                    <div className="space-y-2">
                      {auditors.map((user: User) => (
                        <UserCard key={user._id} user={user} />
                      ))}
                    </div>
                  </div>
                )}

                {fieldAgents.length === 0 && auditors.length === 0 && (
                  <div className="text-center py-8">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No team members yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start building your team by adding field agents and auditors.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auditor View - Show field agents */}
          {currentUser?.role === 'auditor' && (
            <div className="p-4">
              {fieldAgents.length > 0 ? (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <UserGroupIcon className="h-5 w-5 mr-2 text-green-600" />
                    Field Agents ({fieldAgents.length})
                  </h4>
                  <div className="space-y-2">
                    {fieldAgents.map((user: User) => (
                      <UserCard key={user._id} user={user} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No field agents found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No field agents are currently assigned to your admin.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="input w-full"
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="input w-full"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                    className="input w-full"
                    placeholder="Enter 10-digit phone number"
                    pattern="[0-9]{10}"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="input w-full"
                    placeholder="Enter password (min 6 characters)"
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    required
                    value={createForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as any
                      setCreateForm({
                        ...createForm, 
                        role: newRole,
                        // Reset assignedTo when role changes
                        assignedTo: newRole === 'admin' ? '' : createForm.assignedTo
                      })
                    }}
                    className="input w-full"
                  >
                    {currentUser?.role === 'superSuperAdmin' && <option value="superSuperAdmin">Super Super Admin</option>}
                    {currentUser?.role === 'superSuperAdmin' && <option value="superAdmin">Super Admin</option>}
                    {canCreateAdmins && <option value="admin">Admin</option>}
                    <option value="fieldAgent">Field Agent</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>

                {/* Admin Assignment for Field Agents and Auditors */}
                {(createForm.role === 'fieldAgent' || createForm.role === 'auditor') && (currentUser?.role === 'superAdmin' || currentUser?.role === 'superSuperAdmin') && (
                  <div>
                    {admins.length > 0 ? (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assign to Admin *
                        </label>
                        <select
                          required
                          value={createForm.assignedTo}
                          onChange={(e) => setCreateForm({...createForm, assignedTo: e.target.value})}
                          className="input w-full"
                          disabled={isLoadingAdmins}
                        >
                          <option value="">
                            {isLoadingAdmins ? 'Loading admins...' : 'Select an admin'}
                          </option>
                          {admins.map((admin: User) => (
                            <option key={admin._id} value={admin._id}>
                              {admin.name} ({admin.email})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          This user will be assigned to the selected admin
                        </p>
                      </>
                    ) : (
                      <div className="p-3 bg-red-50 rounded-md">
                        <p className="text-sm text-red-700">
                          No active admins available. Please create an admin first before creating field agents or auditors.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Info message for regular admins */}
                {(createForm.role === 'fieldAgent' || createForm.role === 'auditor') && currentUser?.role === 'admin' && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                      This user will be automatically assigned to you (your admin account).
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={createForm.location.city}
                      onChange={(e) => setCreateForm({
                        ...createForm, 
                        location: {...createForm.location, city: e.target.value}
                      })}
                      className="input w-full"
                      placeholder="Enter city"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={createForm.location.state}
                      onChange={(e) => setCreateForm({
                        ...createForm, 
                        location: {...createForm.location, state: e.target.value}
                      })}
                      className="input w-full"
                      placeholder="Enter state"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn-primary"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 