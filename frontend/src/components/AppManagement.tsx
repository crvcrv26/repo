import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  CloudArrowUpIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { getAppDownloadUrl } from '../utils/config';

interface AppVersion {
  _id: string;
  appType: 'main' | 'emergency';
  version: string;
  versionCode: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  description: string;
  features: string[];
  isActive: boolean;
  downloadCount: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const AppManagement: React.FC = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAppType, setSelectedAppType] = useState<'main' | 'emergency'>('main');
  const [uploadForm, setUploadForm] = useState({
    version: '',
    versionCode: '',
    description: '',
    features: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  // Fetch app versions
  const { data: appVersionsData, isLoading: appVersionsLoading } = useQuery({
    queryKey: ['app-versions'],
    queryFn: async () => {
      const response = await api.get('/app-management/versions');
      return response.data;
    }
  });

  const appVersions = appVersionsData?.data || [];

  // Upload app version mutation
  const uploadAppMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/app-management/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('App version uploaded successfully');
      setShowUploadModal(false);
      setUploadForm({
        version: '',
        versionCode: '',
        description: '',
        features: ''
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload app version');
    }
  });

  // Delete app version mutation
  const deleteAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const response = await api.delete(`/app-management/versions/${appId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('App version deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete app version');
    }
  });

  // Toggle app version status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ appId, isActive }: { appId: string; isActive: boolean }) => {
      const response = await api.put(`/app-management/versions/${appId}/status`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      toast.success('App version status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update app version status');
    }
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select an APK file');
      return;
    }

    const formData = new FormData();
    formData.append('apkFile', selectedFile);
    formData.append('appType', selectedAppType);
    formData.append('version', uploadForm.version);
    formData.append('versionCode', uploadForm.versionCode);
    formData.append('description', uploadForm.description);
    formData.append('features', uploadForm.features);

    uploadAppMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Management</h1>
          <p className="text-gray-600">Manage main and emergency app versions</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <CloudArrowUpIcon className="w-4 h-4 mr-2" />
          Upload New App
        </button>
      </div>

      {/* App Versions Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">App Versions</h2>
        </div>
        
        {appVersionsLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : appVersions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appVersions.map((app: AppVersion) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.appType === 'main' ? 'Main App' : 'Emergency App'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {app.appType === 'main' 
                              ? 'Full features with offline search' 
                              : 'Online-only work'
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">v{app.version}</div>
                      <div className="text-sm text-gray-500">Code: {app.versionCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircleIcon className="w-4 h-4 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.downloadCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const downloadUrl = getAppDownloadUrl(app._id);
                            window.open(downloadUrl, '_blank');
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Download"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this app version?')) {
                              deleteAppMutation.mutate(app._id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No app versions found</p>
            <p className="text-sm text-gray-400 mt-1">
              Upload your first app version to get started
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New App Version</h3>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">App Type</label>
                  <select
                    value={selectedAppType}
                    onChange={(e) => setSelectedAppType(e.target.value as 'main' | 'emergency')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="main">Main App (Full features with offline search)</option>
                    <option value="emergency">Emergency App (Online-only work)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">APK File</label>
                  <input
                    type="file"
                    accept=".apk"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">Select an APK file (max 100MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <input
                    type="text"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 1.0.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Version Code</label>
                  <input
                    type="number"
                    value={uploadForm.versionCode}
                    onChange={(e) => setUploadForm({ ...uploadForm, versionCode: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 1"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="Describe what's new in this version..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Features (comma-separated)</label>
                  <input
                    type="text"
                    value={uploadForm.features}
                    onChange={(e) => setUploadForm({ ...uploadForm, features: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Offline search, Payment management, QR codes"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadAppMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {uploadAppMutation.isPending ? 'Uploading...' : 'Upload App'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppManagement;
