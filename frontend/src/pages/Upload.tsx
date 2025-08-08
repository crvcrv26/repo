import React, { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../hooks/useAuth'

interface UploadResult {
  total: number
  successful: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
}

export default function Upload() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadAPI.bulkUploadVehicles(formData),
    onSuccess: (response) => {
      setUploadResult(response.data.data)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Bulk upload completed!')
      setIsUploading(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Upload failed')
      setIsUploading(false)
    }
  })

  // Template download
  const downloadTemplate = async () => {
    try {
      const response = await uploadAPI.downloadTemplate()
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'vehicle-upload-template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Template downloaded successfully')
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append('file', file)
    formData.append('skipFirstRow', 'true')

    setIsUploading(true)
    bulkUploadMutation.mutate(formData)
  }, [bulkUploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  })

  const canUpload = user?.role === 'admin' || user?.role === 'superAdmin' || user?.role === 'superSuperAdmin'

  if (!canUpload) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to upload vehicles.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
          <p className="text-gray-600">Upload multiple vehicles via Excel file</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="btn-secondary"
        >
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          Download Template
        </button>
      </div>

      {/* Upload Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Upload Instructions</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Download the template and fill in vehicle information</p>
          <p>• Required fields: Vehicle Number, Owner Name, Owner Phone, Make, Model, Year, Address, City, State</p>
          <p>• Supported formats: .xlsx, .xls, .csv</p>
          <p>• Maximum file size: 10MB</p>
          <p>• First row should contain headers (check "Skip first row" if needed)</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              {isUploading ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600">Uploading vehicles...</p>
                </div>
              ) : isDragActive ? (
                <p className="text-lg font-medium text-blue-600">Drop the file here</p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drag and drop your Excel file here
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    or click to browse files
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Upload Results</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DocumentArrowDownIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Total</p>
                    <p className="text-2xl font-bold text-blue-900">{uploadResult.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Successful</p>
                    <p className="text-2xl font-bold text-green-900">{uploadResult.successful}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-900">Failed</p>
                    <p className="text-2xl font-bold text-red-900">{uploadResult.failed}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-900">Success Rate</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {uploadResult.total > 0 
                        ? Math.round((uploadResult.successful / uploadResult.total) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {uploadResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Error Details</h4>
                <div className="bg-red-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {uploadResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-800 mb-2">
                      <span className="font-medium">Row {error.row}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Upload Guidelines */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">File Format Guidelines</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Required Fields</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Vehicle Number (unique)</li>
                <li>• Owner Name</li>
                <li>• Owner Phone (10 digits)</li>
                <li>• Make</li>
                <li>• Model</li>
                <li>• Year (1900-2025)</li>
                <li>• Address</li>
                <li>• City</li>
                <li>• State</li>
                <li>• Loan Amount</li>
                <li>• Outstanding Amount</li>
                <li>• Default Amount</li>
                <li>• Default Date</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Optional Fields</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Owner Email</li>
                <li>• Vehicle Type (car, bike, truck, etc.)</li>
                <li>• Color</li>
                <li>• Engine Number</li>
                <li>• Chassis Number</li>
                <li>• Status (pending, assigned, etc.)</li>
                <li>• Priority (low, medium, high, urgent)</li>
                <li>• Pincode</li>
                <li>• Bank Name</li>
                <li>• Branch Name</li>
                <li>• Notes</li>
                <li>• Tags (comma-separated)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 