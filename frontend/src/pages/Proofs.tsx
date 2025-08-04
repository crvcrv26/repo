import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proofsAPI, vehiclesAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  ArrowUpTrayIcon,
  EyeIcon,
  TrashIcon,
  DocumentIcon,
  PhotoIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../hooks/useAuth'

interface Proof {
  _id: string
  filename: string
  url: string
  originalName: string
  mimetype: string
  size: number
  uploadedAt: string
}

interface Vehicle {
  _id: string
  vehicleNumber: string
  ownerName: string
  assignedTo?: {
    _id: string
    name: string
  }
  recoveryDetails: {
    recoveryPhotos: Proof[]
    recoveryNotes?: string
  }
}

export default function Proofs() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  // Fetch vehicles for proof management
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesAPI.getAll({ limit: 100 }),
  })

  // Fetch proofs for selected vehicle
  const { data: proofsData, refetch: refetchProofs } = useQuery({
    queryKey: ['proofs', selectedVehicle],
    queryFn: () => proofsAPI.getByVehicle(selectedVehicle),
    enabled: !!selectedVehicle
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => proofsAPI.upload(selectedVehicle, formData),
    onSuccess: () => {
      refetchProofs()
      toast.success('Proofs uploaded successfully')
      setIsUploading(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Upload failed')
      setIsUploading(false)
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (proofId: string) => proofsAPI.delete(proofId),
    onSuccess: () => {
      refetchProofs()
      toast.success('Proof deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete proof')
    }
  })

  const vehicles = vehiclesData?.data?.data || []
  const proofs = proofsData?.data?.data || []
  const selectedVehicleData = vehicles.find((v: Vehicle) => v._id === selectedVehicle)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedVehicle) {
      toast.error('Please select a vehicle first')
      return
    }

    if (acceptedFiles.length === 0) return

    const formData = new FormData()
    acceptedFiles.forEach(file => {
      formData.append('proofs', file)
    })

    setIsUploading(true)
    uploadMutation.mutate(formData)
  }, [selectedVehicle, uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  })

  const handleDelete = (proofId: string) => {
    if (window.confirm('Are you sure you want to delete this proof?')) {
      deleteMutation.mutate(proofId)
    }
  }

  const handleDownload = (proof: Proof) => {
    const link = document.createElement('a')
    link.href = `${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000'}${proof.url}`
    link.download = proof.originalName || proof.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const canUploadProofs = user?.role === 'fieldAgent'
  const canDeleteProofs = user?.role === 'superAdmin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proof Management</h1>
        <p className="text-gray-600">Upload and manage recovery proofs for vehicles</p>
      </div>

      {/* Vehicle Selection */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Select Vehicle</h3>
        </div>
        <div className="p-6">
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="input w-full max-w-md"
          >
            <option value="">Choose a vehicle...</option>
            {vehicles.map((vehicle: Vehicle) => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.vehicleNumber} - {vehicle.ownerName}
                {vehicle.assignedTo ? ` (${vehicle.assignedTo.name})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedVehicle && (
        <>
          {/* Vehicle Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
            </div>
            <div className="p-6">
              {selectedVehicleData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vehicle Number</p>
                    <p className="text-lg text-gray-900">{selectedVehicleData.vehicleNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Owner Name</p>
                    <p className="text-lg text-gray-900">{selectedVehicleData.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Assigned To</p>
                    <p className="text-lg text-gray-900">
                      {selectedVehicleData.assignedTo?.name || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Recovery Notes</p>
                    <p className="text-lg text-gray-900">
                      {selectedVehicleData.recoveryDetails.recoveryNotes || 'No notes'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Area */}
          {canUploadProofs && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Upload Proofs</h3>
              </div>
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
                        <p className="text-sm text-gray-600">Uploading proofs...</p>
                      </div>
                    ) : isDragActive ? (
                      <p className="text-lg font-medium text-blue-600">Drop the files here</p>
                    ) : (
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          Drag and drop proof files here
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          or click to browse files
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Supported: JPEG, PNG, GIF, PDF (max 10MB each)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proofs List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Uploaded Proofs</h3>
            </div>
            <div className="p-6">
              {proofs.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No proofs uploaded</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload proof files for this vehicle.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proofs.map((proof: Proof) => (
                    <div key={proof._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          {proof.mimetype.startsWith('image/') ? (
                            <PhotoIcon className="h-5 w-5 text-blue-600" />
                          ) : (
                            <DocumentIcon className="h-5 w-5 text-gray-600" />
                          )}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {proof.originalName || proof.filename}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDownload(proof)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canDeleteProofs && (
                            <button
                              onClick={() => handleDelete(proof._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs text-gray-500">
                        <p>Size: {(proof.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p>Type: {proof.mimetype}</p>
                        <p>Uploaded: {new Date(proof.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!canUploadProofs && (
        <div className="text-center py-12">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only field agents can upload proofs for their assigned vehicles.
          </p>
        </div>
      )}
    </div>
  )
} 