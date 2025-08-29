import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { XMarkIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';
import { excelAPI, usersAPI } from '../services/api';

interface AdminAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: any;
  currentUser: any;
}

export default function AdminAssignmentModal({ isOpen, onClose, file, currentUser }: AdminAssignmentModalProps) {
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [primaryAdmin, setPrimaryAdmin] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch admins for assignment
  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => usersAPI.getAdmins(),
    enabled: isOpen,
  });
  const admins = Array.isArray(adminsData?.data?.data) ? adminsData.data.data : [];

  // Initialize state when file changes
  React.useEffect(() => {
    if (file) {
      const currentAssignedAdmins = file.assignedAdmins?.map((admin: any) => admin._id) || [];
      setSelectedAdmins(currentAssignedAdmins);
      setPrimaryAdmin(file.assignedTo?._id || '');
    }
  }, [file]);

  const updateAssignmentsMutation = useMutation({
    mutationFn: ({ fileId, assignedAdmins }: { fileId: string; assignedAdmins: string[] }) =>
      excelAPI.updateAssignments(fileId, { assignedAdmins }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-files'] });
      toast.success('Admin assignments updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update admin assignments');
    }
  });

  const handleSave = () => {
    if (!primaryAdmin) {
      toast.error('Please select a primary admin');
      return;
    }

    // For admin-uploaded files, ensure the primary admin is the uploader
    if (file.uploadedBy?.role === 'admin' && primaryAdmin !== file.uploadedBy._id) {
      toast.error('Cannot change primary admin for files uploaded by admin users. The primary admin must remain the uploader.');
      return;
    }

    // Ensure primary admin is included in selected admins
    const finalAdmins = selectedAdmins.includes(primaryAdmin) 
      ? selectedAdmins 
      : [primaryAdmin, ...selectedAdmins];

    updateAssignmentsMutation.mutate({
      fileId: file._id,
      assignedAdmins: finalAdmins
    });
  };

  const handleAdminToggle = (adminId: string) => {
    if (adminId === primaryAdmin) {
      // Can't deselect primary admin
      return;
    }

    setSelectedAdmins(prev => 
      prev.includes(adminId) 
        ? prev.filter(id => id !== adminId)
        : [...prev, adminId]
    );
  };

  const handlePrimaryAdminChange = (adminId: string) => {
    setPrimaryAdmin(adminId);
    // Ensure primary admin is always selected
    if (!selectedAdmins.includes(adminId)) {
      setSelectedAdmins(prev => [...prev, adminId]);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Manage Admin Assignments</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              File: <span className="font-medium">{file.originalName}</span>
            </p>
            <p className="text-xs text-gray-500">
              Currently assigned to {file.assignedAdmins?.length || 1} admin(s)
            </p>
            {file.uploadedBy?.role === 'admin' && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <strong>Note:</strong> This file was uploaded by an admin. The primary admin cannot be changed and must remain the uploader.
              </div>
            )}
          </div>

          {adminsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading admins...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary Admin Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Admin *
                  {file.uploadedBy?.role === 'admin' && (
                    <span className="text-xs text-gray-500 ml-1">(Locked for admin-uploaded files)</span>
                  )}
                </label>
                <select
                  value={primaryAdmin}
                  onChange={(e) => handlePrimaryAdminChange(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    file.uploadedBy?.role === 'admin' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  required
                  disabled={file.uploadedBy?.role === 'admin'}
                >
                  <option value="">Select primary admin</option>
                  {admins.map((admin: any) => (
                    <option key={admin._id} value={admin._id}>
                      {admin.name} ({admin.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Admins Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Admins
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {admins.map((admin: any) => (
                    <label key={admin._id} className="flex items-center space-x-2 py-2 hover:bg-gray-50 rounded px-1">
                      <input
                        type="checkbox"
                        checked={selectedAdmins.includes(admin._id)}
                        onChange={() => handleAdminToggle(admin._id)}
                        disabled={admin._id === primaryAdmin}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">
                          {admin.name}
                          {admin._id === primaryAdmin && (
                            <span className="text-blue-600 text-xs ml-1">(Primary)</span>
                          )}
                        </span>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      </div>
                      {selectedAdmins.includes(admin._id) && (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {selectedAdmins.length} admin(s)
                </p>
              </div>

              {/* Current Assignments Display */}
              {file.assignedAdmins && file.assignedAdmins.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Assignments</h4>
                  <div className="space-y-1">
                    {file.assignedAdmins.map((admin: any, index: number) => (
                      <div key={admin._id} className="flex items-center space-x-2">
                        <UserIcon className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {admin.name} ({admin.email})
                          {index === 0 && <span className="text-blue-600 ml-1">(Primary)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={updateAssignmentsMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateAssignmentsMutation.isPending || !primaryAdmin}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {updateAssignmentsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
