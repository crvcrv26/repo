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
  getFieldAgents: () => api.get('/users/field-agents/list'),
  getByAdmin: (adminId: string) => api.get(`/users/by-admin/${adminId}`),
  getStats: () => api.get('/users/stats/overview'),
}

// Vehicles API
export const vehiclesAPI = {
  getAll: (params?: any) => api.get('/vehicles', { params }),
  getById: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
  assign: (id: string, data: { assignedTo: string }) =>
    api.put(`/vehicles/${id}/assign`, data),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    api.put(`/vehicles/${id}/status`, data),
  getStats: () => api.get('/vehicles/stats/overview'),
}

// Tasks API
export const tasksAPI = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  getStats: () => api.get('/tasks/stats/overview'),
  getAgentPerformance: () => api.get('/tasks/agent-performance'),
  updateStatus: (taskId: string, data: any) => api.put(`/vehicles/${taskId}/status`, data),
}

// Proofs API
export const proofsAPI = {
  getByVehicle: (vehicleId: string) => api.get(`/proofs/vehicle/${vehicleId}`),
  upload: (vehicleId: string, data: any) =>
    api.post(`/proofs/vehicle/${vehicleId}`, data),
  delete: (proofId: string) => api.delete(`/proofs/${proofId}`),
}

// Upload API
export const uploadAPI = {
  uploadFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadFiles: (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return api.post('/upload/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  bulkUploadVehicles: (formData: FormData) => {
    return api.post('/upload/bulk-vehicles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  downloadTemplate: () => api.get('/upload/template', { responseType: 'blob' }),
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

export default api 