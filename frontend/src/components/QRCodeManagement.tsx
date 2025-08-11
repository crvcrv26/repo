import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '../utils/config';
import { useAuth } from '../hooks/useAuth';
import {
  QrCodeIcon,
  PhotoIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface QRCode {
  _id: string;
  qrImageUrl: string;
  qrImageName: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QRCodeManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [qrToDelete, setQrToDelete] = useState<QRCode | null>(null);

  // Determine if user is Super Admin
  const isSuperAdmin = user?.role === 'superAdmin' || user?.role === 'superSuperAdmin';

  // Get QR codes based on user role
  const { data: qrCodes, isLoading } = useQuery({
    queryKey: ['qr-codes', user?.role],
    queryFn: async () => {
      let endpoint = '/api/payment-qr/admin/qr';
      if (isSuperAdmin) {
        endpoint = '/api/admin-payments/super-admin/qr';
      }
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch QR codes');
      }
      
      const data = await response.json();
      
      return data.data as QRCode[];
    },
    enabled: !!user
  });

  // Upload QR code mutation
  const uploadQRMutation = useMutation({
    mutationFn: async (formData: FormData) => {
  
      
      let endpoint = '/api/payment-qr/qr';
      if (isSuperAdmin) {
        endpoint = '/api/admin-payments/super-admin/qr';
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        throw new Error(errorData.message || 'Failed to upload QR code');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('QR code uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['qr-codes', user?.role] });
      setShowUploadModal(false);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast.error(error.message || 'Failed to upload QR code');
    }
  });

  // Toggle QR code active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (qrId: string) => {
      let endpoint = `/api/payment-qr/admin/qr/${qrId}/toggle-active`;
      if (isSuperAdmin) {
        endpoint = `/api/admin-payments/super-admin/qr/${qrId}/toggle-active`;
      }
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle QR code status');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'QR code status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['qr-codes', user?.role] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update QR code status');
    }
  });

  // Delete QR code mutation
  const deleteQRMutation = useMutation({
    mutationFn: async (qrId: string) => {
      let endpoint = `/api/payment-qr/admin/qr/${qrId}`;
      if (isSuperAdmin) {
        endpoint = `/api/admin-payments/super-admin/qr/${qrId}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete QR code');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'QR code deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['qr-codes', user?.role] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete QR code');
    }
  });

  const handleUploadQR = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    uploadQRMutation.mutate(formData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
          <p className="text-gray-600">
            {isSuperAdmin 
              ? 'Upload and manage your QR code for admin payments'
              : 'Upload and manage payment QR codes for users'
            }
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary"
        >
          <QrCodeIcon className="h-4 w-4 mr-2" />
          {isSuperAdmin ? 'Upload QR Code' : 'Upload QR Code'}
        </button>
      </div>

      {/* QR Codes List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            QR Codes
          </h3>
        </div>
        <div className="p-6">
          {qrCodes && qrCodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrCodes.map((qrCode) => (
                <div key={qrCode._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <QrCodeIcon className={`h-5 w-5 ${qrCode.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        qrCode.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {qrCode.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {qrCode.isActive && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedQR(qrCode);
                          setShowPreviewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View QR Code"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {/* Show toggle and delete for all QR codes */}
                      <button
                        onClick={() => toggleActiveMutation.mutate(qrCode._id)}
                        disabled={toggleActiveMutation.isPending}
                        className={`${
                          qrCode.isActive 
                            ? 'text-orange-600 hover:text-orange-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={qrCode.isActive ? 'Deactivate QR Code' : 'Activate QR Code'}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setQrToDelete(qrCode);
                          setShowDeleteModal(true);
                        }}
                        disabled={deleteQRMutation.isPending || qrCode.isActive}
                        className={`${
                          qrCode.isActive 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-600 hover:text-red-900'
                        }`}
                        title={qrCode.isActive ? 'Cannot delete active QR code' : 'Delete QR Code'}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <img
                      src={getImageUrl(qrCode.qrImageUrl)}
                      alt="QR Code"
                      className="w-full h-32 object-cover rounded border shadow-md"
                      
                      crossOrigin="anonymous"
                    />
                  </div>
                  
                  {qrCode.description && (
                    <p className="text-sm text-gray-600 mb-2">{qrCode.description}</p>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    <p>Created: {formatDate(qrCode.createdAt)}</p>
                    <p>Updated: {formatDate(qrCode.updatedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No QR codes found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isSuperAdmin 
                  ? 'Upload your QR code to receive payments from admins.'
                  : 'Upload your first QR code to get started.'
                }
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 btn btn-primary btn-sm"
              >
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Upload QR Code
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload QR Code Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isSuperAdmin ? 'Upload Your QR Code' : 'Upload QR Code'}
              </h3>
              <form onSubmit={handleUploadQR}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="qrImage" className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Image
                    </label>
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="qrImage" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                            <span>Upload a file</span>
                            <input
                              id="qrImage"
                              name="qrImage"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              required
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description (optional)
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder={
                        isSuperAdmin 
                          ? "Add any additional information about this QR code for admin payments..."
                          : "Add any additional information about this QR code..."
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadQRMutation.isPending}
                    className="btn btn-primary"
                  >
                    {uploadQRMutation.isPending ? 'Uploading...' : 'Upload QR Code'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Preview QR Code Modal */}
      {showPreviewModal && selectedQR && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">QR Code Preview</h3>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={getImageUrl(selectedQR.qrImageUrl)}
                    alt="QR Code"
                    className="w-64 h-64 object-contain border rounded"
                    
                    crossOrigin="anonymous"
                  />
                </div>
                
                {selectedQR.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-600">{selectedQR.description}</p>
                  </div>
                )}
                
                <div className="text-sm text-gray-500">
                  <p>Status: <span className={`font-medium ${
                    selectedQR.isActive ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {selectedQR.isActive ? 'Active' : 'Inactive'}
                  </span></p>
                  <p>Created: {formatDate(selectedQR.createdAt)}</p>
                  <p>Updated: {formatDate(selectedQR.updatedAt)}</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedQR(null);
                  }}
                  className="btn btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && qrToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <TrashIcon className="h-6 w-6 text-red-500 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Delete QR Code</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this QR code? This action cannot be undone.
                </p>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center space-x-3">
                    <img
                      src={getImageUrl(qrToDelete.qrImageUrl)}
                      alt="QR Code"
                      className="w-16 h-16 object-cover rounded border"
                      crossOrigin="anonymous"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {qrToDelete.description || 'QR Code'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {formatDate(qrToDelete.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setQrToDelete(null);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteQRMutation.mutate(qrToDelete._id);
                    setShowDeleteModal(false);
                    setQrToDelete(null);
                  }}
                  disabled={deleteQRMutation.isPending}
                  className="btn btn-danger"
                >
                  {deleteQRMutation.isPending ? 'Deleting...' : 'Delete QR Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
