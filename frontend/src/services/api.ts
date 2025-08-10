import axios from 'axios'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
}

// Users API
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  updatePassword: (id: string, data: { newPassword: string }) => api.put(`/users/${id}/password`, data),
  updateStatus: (id: string, data: { isActive: boolean }) => api.put(`/users/${id}/status`, data),
  getFieldAgents: () => api.get('/users/field-agents/list'),
  getAdmins: () => api.get('/users/admins/list'),
  getByAdmin: (adminId: string) => api.get(`/users/by-admin/${adminId}`),
  getStats: () => api.get('/users/stats/overview'),
}



// Excel API
export const excelAPI = {
  upload: (formData: FormData) => api.post('/excel/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getFiles: (params?: any) => api.get('/excel/files', { params }),
  getFileById: (id: string) => api.get(`/excel/files/${id}`),
  deleteFile: (id: string) => api.delete(`/excel/files/${id}`),
  reassignFile: (id: string, data: { assignedTo: string }) => api.put(`/excel/files/${id}/reassign`, data),
  downloadTemplate: () => api.get('/excel/template', { responseType: 'blob' }),
  searchVehicles: (params?: any) => api.get('/excel/vehicles', { params }),
}

// OTP API
export const otpAPI = {
  generate: (userId: string) => api.post('/otp/generate', { userId }),
  verify: (email: string, otp: string) => api.post('/otp/verify', { email, otp }),
  view: (userId: string) => api.get(`/otp/view/${userId}`),
  list: () => api.get('/otp/list'),
  invalidate: (userId: string) => api.delete(`/otp/invalidate/${userId}`),
}

// Notifications API
export const notificationsAPI = {
  logAction: (data: { vehicleNumber: string; action: 'viewed' | 'verified'; vehicleId?: string }) => 
    api.post('/notifications/log-action', data),
  getAll: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  getStats: () => api.get('/notifications/stats'),
}

// Payments API
export const paymentsAPI = {
  // Admin payment management
  getRates: () => api.get('/payments/rates'),
  updateRates: (data: { auditorRate: number; fieldAgentRate: number }) => 
    api.put('/payments/rates', data),
  getAdminSummary: (params?: any) => api.get('/payments/admin-summary', { params }),
  getAdminDetails: (params?: any) => api.get('/payments/admin-details', { params }),
  markPaymentAsPaid: (paymentId: string, data: { paidAmount: number; notes?: string }) =>
    api.put(`/payments/${paymentId}/mark-paid`, data),
  generateMonthlyPayments: (data: { month: number; year: number }) =>
    api.post('/payments/generate-monthly', data),
  
  // User payment dues
  getUserDues: (params?: any) => api.get('/payments/user-dues', { params }),
}

// Money Management API
export const moneyAPI = {
  // CRUD operations
  getAll: (params?: any) => api.get('/money', { params }),
  getById: (id: string) => api.get(`/money/${id}`),
  create: (data: any) => api.post('/money', data),
  update: (id: string, data: any) => api.put(`/money/${id}`, data),
  delete: (id: string) => api.delete(`/money/${id}`),
  deleteAll: () => api.delete('/money/delete-all'),
  
  // Import/Export
  import: (formData: FormData) => api.post('/money/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  export: (params?: any) => api.get('/money/export', { 
    params,
    responseType: 'blob'
  }),
  
  // Vehicle lookup helper
  getVehicleByReg: (registrationNumber: string) => 
    api.get(`/excel/vehicles/by-reg/${registrationNumber}`)
}

export default api 