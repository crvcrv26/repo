import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { excelAPI, usersAPI, fileStorageAPI } from '../services/api'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  EyeIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

interface ExcelFile {
  _id: string
  filename: string
  originalName: string
  fileSize: number
  uploadedBy: {
    _id: string
    name: string
    email: string
  }
  assignedTo: {
    _id: string
    name: string
    email: string
  }
  totalRows: number
  processedRows: number
  failedRows: number
  skippedRows: number
  status: 'processing' | 'completed' | 'failed' | 'partial'
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

interface UploadForm {
  file: File | null
  assignedTo: string
}

export default function ExcelFiles() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  
  // State for filters and pagination
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  
  // State for upload modal
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    file: null,
    assignedTo: ''
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')

  // Fetch Excel files
  const { data, isLoading, error } = useQuery({
    queryKey: ['excel-files', { search, status, page, currentUser: currentUser?.role }],
    queryFn: () => excelAPI.getFiles({ search, status, page, limit: 10 }),
    staleTime: 30000,
  })

  // Fetch admins for assignment (only for super admin)
  const { data: adminsData, error: adminsError, isLoading: adminsLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => usersAPI.getAdmins(),
    enabled: currentUser?.role === 'superSuperAdmin' || currentUser?.role === 'superAdmin',
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch admins:', error)
    }
  })

  // Fetch user's file storage limits
  const { data: storageLimitsData } = useQuery({
    queryKey: ['file-storage-my-limits'],
    queryFn: () => fileStorageAPI.getMyLimits(),
    enabled: !!currentUser?.role,
  })

  const storageLimits = storageLimitsData?.data?.data

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => excelAPI.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-files'] })
      toast.success('Excel file uploaded successfully')
      setShowUploadModal(false)
      resetUploadForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload file')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => excelAPI.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-files'] })
      toast.success('File deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete file')
    }
  })

  const reassignMutation = useMutation({
    mutationFn: ({ fileId, assignedTo }: { fileId: string; assignedTo: string }) => 
      excelAPI.reassignFile(fileId, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-files'] })
      toast.success('File reassigned successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reassign file')
    }
  })

  const files = data?.data?.data || []
  const pagination = data?.data?.pagination
  const admins = Array.isArray(adminsData?.data?.data) ? adminsData.data.data : []
  
  // Debug logging
  console.log('Current user role:', currentUser?.role)
  console.log('Show upload modal:', showUploadModal)
  console.log('Admins data:', adminsData)
  console.log('Admins array:', admins)
  console.log('Admins loading:', adminsLoading)
  console.log('Admins error:', adminsError)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)')
        return
      }
      
      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return
      }

      setUploadForm(prev => ({ ...prev, file }))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!uploadForm.file) {
      toast.error('Please select a file')
      return
    }

    // Validate admin assignment for super admin
    if ((currentUser?.role === 'superSuperAdmin' || currentUser?.role === 'superAdmin') && !uploadForm.assignedTo) {
      toast.error('Please select an admin to assign this file to')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('Starting upload...')
    
    // Start progress simulation
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return 90 // Cap at 90% until actual completion
        return prev + Math.random() * 10 + 5 // Random increment between 5-15%
      })
    }, 500)

    // Update status messages
    const statusInterval = setInterval(() => {
      setUploadStatus(prev => {
        if (prev.includes('Processing')) return 'Validating data...'
        if (prev.includes('Validating')) return 'Processing rows...'
        if (prev.includes('Processing rows')) return 'Creating vehicles...'
        return 'Processing...'
      })
    }, 1500)
    
    try {
      const formData = new FormData()
      formData.append('excelFile', uploadForm.file)
      
      if ((currentUser?.role === 'superSuperAdmin' || currentUser?.role === 'superAdmin') && uploadForm.assignedTo) {
        formData.append('assignedTo', uploadForm.assignedTo)
      }

      await uploadMutation.mutateAsync(formData)
      
      // Complete the progress
      setUploadProgress(100)
      setUploadStatus('Upload completed!')
      
      // Clear intervals
      clearInterval(progressInterval)
      clearInterval(statusInterval)
      
      // Reset after a short delay
      setTimeout(() => {
        setUploadProgress(0)
        setUploadStatus('')
      }, 2000)
      
    } catch (error) {
      // Clear intervals on error
      clearInterval(progressInterval)
      clearInterval(statusInterval)
      setUploadProgress(0)
      setUploadStatus('')
    } finally {
      setIsUploading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      assignedTo: ''
    })
  }

  const handleDelete = (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file? This will also delete all related vehicle data.')) {
      deleteMutation.mutate(fileId)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await excelAPI.downloadTemplate()
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'vehicle_template.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Template downloaded successfully')
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'partial':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-blue-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
        <p className="text-red-600">Failed to load Excel files</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Excel Files</h1>
          <p className="text-gray-600">Manage uploaded Excel files and vehicle data</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn-secondary"
            onClick={handleDownloadTemplate}
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download Template
          </button>
          {(currentUser?.role === 'superSuperAdmin' || currentUser?.role === 'superAdmin' || currentUser?.role === 'admin') && (
            <button 
              className="btn-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
              Upload Excel
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b-2 border-gray-400">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input"
                >
                  <option value="">All Status</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {files.length === 0 ? (
            <div className="text-center py-12">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Excel files</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading an Excel file.
              </p>
              {(currentUser?.role === 'superSuperAdmin' || currentUser?.role === 'superAdmin' || currentUser?.role === 'admin') && (
                <div className="mt-6">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <DocumentArrowUpIcon className="h-5 w-5" />
                    Upload Excel File
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file: ExcelFile) => (
                <div key={file._id} className="border-2 border-gray-400 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <DocumentArrowUpIcon className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.originalName}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span>{file.totalRows} rows</span>
                          <span>•</span>
                          <span className="flex items-center">
                            {getStatusIcon(file.status)}
                            <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                              {file.status}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            Uploaded by {file.uploadedBy.name}
                          </span>
                          <span className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            Assigned to {file.assignedTo.name}
                          </span>
                          <span className="flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDelete(file._id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Delete file"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Processing Results */}
                  {file.status !== 'processing' && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-400">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-green-600 font-medium">{file.processedRows}</p>
                          <p className="text-gray-500">Processed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-yellow-600 font-medium">{file.skippedRows}</p>
                          <p className="text-gray-500">Skipped</p>
                        </div>
                        <div className="text-center">
                          <p className="text-red-600 font-medium">{file.failedRows}</p>
                          <p className="text-gray-500">Failed</p>
                        </div>
                      </div>
                      {file.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {file.errorMessage}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center">
          <nav className="flex space-x-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pageNum === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-400'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Excel File</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only .xlsx and .xls files up to 50MB are allowed
                  </p>
                  
                  {/* Storage Limits Info */}
                  {storageLimits && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <DocumentArrowUpIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Your Total Storage Limits</span>
                      </div>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div>Total Limit: {storageLimits.totalRecordLimit.toLocaleString()} records</div>
                        <div>Used: {storageLimits.usedRecords.toLocaleString()} records</div>
                        <div>Remaining: {storageLimits.remainingRecords.toLocaleString()} records</div>
                        <div className="text-blue-600 font-medium">{storageLimits.description}</div>
                      </div>
                    </div>
                  )}
                </div>

                                 {(currentUser?.role === 'superSuperAdmin' || currentUser?.role === 'superAdmin') && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Assign to Admin
                     </label>
                     {adminsLoading ? (
                       <div className="text-blue-600 text-sm mb-2">
                         Loading admins...
                       </div>
                     ) : adminsError ? (
                       <div className="text-red-600 text-sm mb-2">
                         Failed to load admins. Please try again.
                       </div>
                     ) : (
                       <select
                         value={uploadForm.assignedTo}
                         onChange={(e) => setUploadForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                         className="input"
                         required
                       >
                         <option value="">Select an admin</option>
                         {admins.map((admin: any) => (
                           <option key={admin._id} value={admin._id}>
                             {admin.name} ({admin.email})
                           </option>
                         ))}
                       </select>
                     )}
                     {admins.length === 0 && !adminsError && !adminsLoading && (
                       <p className="text-sm text-gray-500 mt-1">
                         No admins available. Please create an admin user first.
                       </p>
                     )}
                   </div>
                 )}

                                 {/* Progress Indicator */}
                 {isUploading && (
                   <div className="pt-4 border-t-2 border-gray-400">
                     <div className="space-y-3">
                       <div className="flex justify-between text-sm text-gray-600">
                         <span>{uploadStatus}</span>
                         <span>{uploadProgress}%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-2">
                         <div 
                           className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                           style={{ width: `${uploadProgress}%` }}
                         ></div>
                       </div>
                       <div className="text-xs text-gray-500 text-center">
                         {uploadProgress < 100 ? 'Please wait while we process your file...' : 'Upload completed successfully!'}
                       </div>
                     </div>
                   </div>
                 )}

                 <div className="flex justify-end space-x-3 pt-4">
                   <button
                     type="button"
                     onClick={() => {
                       setShowUploadModal(false)
                       resetUploadForm()
                     }}
                     className="btn-secondary"
                     disabled={isUploading}
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     className="btn-primary"
                     disabled={isUploading || !uploadForm.file}
                   >
                     {isUploading ? (
                       <>
                         <ArrowPathIcon className="h-5 w-5 animate-spin" />
                         Uploading...
                       </>
                     ) : (
                       <>
                         <DocumentArrowUpIcon className="h-5 w-5" />
                         Upload
                       </>
                     )}
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