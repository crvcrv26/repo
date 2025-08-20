import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Cog6ToothIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { fileStorageAPI } from '../services/api';

interface FileStorageSetting {
  _id: string;
  role: string;
  totalRecordLimit: number;
  description: string;
  isActive: boolean;
  updatedBy: {
    _id: string;
    name: string;
    email: string;
  };
  updatedAt: string;
}

interface UpdateSettingData {
  totalRecordLimit: number;
  description: string;
}

export default function FileStorageHandling() {
  const queryClient = useQueryClient();
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateSettingData>({
    totalRecordLimit: 0,
    description: ''
  });

  // Fetch file storage settings
  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ['file-storage-settings'],
    queryFn: () => fileStorageAPI.getSettings(),
  });

  const settings: FileStorageSetting[] = settingsData?.data?.data || [];

  // Update setting mutation
  const updateMutation = useMutation({
    mutationFn: ({ role, data }: { role: string; data: UpdateSettingData }) =>
      fileStorageAPI.updateSetting(role, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-storage-settings'] });
      toast.success('File storage setting updated successfully');
      setEditingSetting(null);
      setEditForm({
        totalRecordLimit: 0,
        description: ''
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update setting');
    }
  });

  const handleEdit = (setting: FileStorageSetting) => {
    setEditingSetting(setting._id);
    setEditForm({
      totalRecordLimit: setting.totalRecordLimit,
      description: setting.description
    });
  };

  const handleCancelEdit = () => {
    setEditingSetting(null);
    setEditForm({
      totalRecordLimit: 0,
      description: ''
    });
  };

  const handleSave = (role: string) => {
    updateMutation.mutate({ role, data: editForm });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN');
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'superAdmin':
        return 'Super Admin';
      case 'superSuperAdmin':
        return 'Super Super Admin';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'superAdmin':
        return 'bg-red-100 text-red-800';
      case 'superSuperAdmin':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Settings</h2>
          <p className="text-gray-600">Failed to load file storage settings. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Cog6ToothIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">File Storage Handling</h1>
            <p className="text-gray-600">Manage total cumulative record limits for different admin roles</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <DocumentArrowUpIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Total Cumulative Limits</h3>
              <p className="text-sm text-blue-700">
                Set total cumulative record limits for each admin role. Users can upload files until they reach their total limit. 
                For example: If an admin has 1 lakh records and limit is 5 lakh, they can upload 4 lakh more records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6">
        {settings.map((setting) => (
          <div key={setting._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleColor(setting.role)}`}>
                  {getRoleDisplayName(setting.role)}
                </span>
                {setting.isActive && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Active
                  </span>
                )}
              </div>
              
              {editingSetting === setting._id ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSave(setting.role)}
                    disabled={updateMutation.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleEdit(setting)}
                  className="btn btn-outline-primary btn-sm"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
            </div>

            {editingSetting === setting._id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Record Limit
                  </label>
                  <input
                    type="number"
                    value={editForm.totalRecordLimit}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      totalRecordLimit: parseInt(e.target.value) || 0
                    }))}
                    className="input"
                    min="1000"
                    max="10000000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: 1,000 | Maximum: 10,000,000
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    className="input"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editForm.description.length}/500 characters
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Total Record Limit
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNumber(setting.totalRecordLimit)} records
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Cumulative limit across all uploads
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Description
                  </label>
                  <p className="text-gray-700">{setting.description}</p>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Last updated by {setting.updatedBy.name}</span>
                    <span>{new Date(setting.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {settings.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No File Storage Settings</h3>
          <p className="text-gray-600 mb-4">
            File storage settings have not been configured yet. Please run the initialization script.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm text-yellow-800">
              <strong>To initialize settings:</strong> Run <code className="bg-yellow-100 px-2 py-1 rounded">node script/init-file-storage-settings.js</code> in your backend directory.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

