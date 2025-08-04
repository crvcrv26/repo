import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { vehiclesAPI, tasksAPI, usersAPI } from '../services/api'
import { 
  TruckIcon, 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon, 
  CurrencyRupeeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function Dashboard() {
  const { data: vehicleStats, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicleStats'],
    queryFn: () => vehiclesAPI.getStats(),
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const { data: taskStats, isLoading: taskLoading } = useQuery({
    queryKey: ['taskStats'],
    queryFn: () => tasksAPI.getStats(),
    refetchInterval: 30000
  })

  const { data: userStats, isLoading: userLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => usersAPI.getStats(),
    refetchInterval: 30000
  })

  const stats = vehicleStats?.data?.data || {}
  const taskData = taskStats?.data?.data || {}
  const userData = userStats?.data?.data || {}

  // Prepare chart data
  const statusChartData = [
    { name: 'Pending', value: stats.pending || 0, color: '#F59E0B' },
    { name: 'Assigned', value: stats.assigned || 0, color: '#3B82F6' },
    { name: 'In Progress', value: stats.inProgress || 0, color: '#8B5CF6' },
    { name: 'Recovered', value: stats.recovered || 0, color: '#10B981' },
    { name: 'Failed', value: stats.failed || 0, color: '#EF4444' }
  ]

  const priorityChartData = [
    { name: 'Urgent', value: taskData.urgent || 0, color: '#DC2626' },
    { name: 'High', value: taskData.high || 0, color: '#EA580C' },
    { name: 'Medium', value: taskData.medium || 0, color: '#D97706' },
    { name: 'Low', value: taskData.low || 0, color: '#059669' }
  ]

  const totalVehicles = stats.total || 0
  const totalOutstanding = stats.totalOutstanding || 0
  const recoveredAmount = stats.recoveredAmount || 0
  const completedTasks = stats.recovered || 0
  const activeUsers = userData.active || 0

  if (vehicleLoading || taskLoading || userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your vehicle repossession operations</p>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TruckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
              <p className="text-2xl font-bold text-gray-900">{totalVehicles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CurrencyRupeeIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Outstanding Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{(totalOutstanding / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recovered</p>
              <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Status Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {completedTasks} vehicles recovered this month
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                ₹{(recoveredAmount / 100000).toFixed(1)}L recovered this month
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {stats.pending || 0} vehicles pending assignment
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {activeUsers} active field agents
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 