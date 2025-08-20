import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { getAppDownloadUrl } from '../utils/config';

interface AppVersion {
  _id: string;
  appType: 'main' | 'emergency';
  version: string;
  versionCode: number;
  fileName: string;
  description: string;
  features: string[];
  downloadCount: number;
  createdAt: string;
}

const AppDownload: React.FC = () => {
  // Fetch public app versions
  const { data: appVersionsData, isLoading } = useQuery({
    queryKey: ['public-app-versions'],
    queryFn: async () => {
      const response = await api.get('/app-management/public/versions');
      return response.data;
    }
  });

  const appVersions = appVersionsData?.data || [];

  const getAppTypeInfo = (appType: string) => {
    switch (appType) {
      case 'main':
        return {
          title: 'Main App',
          description: 'Full features with offline search for admin, field agent, and auditor',
          icon: DevicePhoneMobileIcon,
          color: 'bg-blue-100 text-blue-800',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'emergency':
        return {
          title: 'Emergency App',
          description: 'Online-only work with all user support',
          icon: ExclamationTriangleIcon,
          color: 'bg-red-100 text-red-800',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          title: 'Unknown App',
          description: '',
          icon: DevicePhoneMobileIcon,
          color: 'bg-gray-100 text-gray-800',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const handleDownload = (appId: string, fileName: string) => {
    const downloadUrl = getAppDownloadUrl(appId);
    window.open(downloadUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Download RepoTrack Mobile Apps
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the right app for your needs. Download the latest versions of our mobile applications.
        </p>
      </div>

      {/* App Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {appVersions.map((app: AppVersion) => {
          const appInfo = getAppTypeInfo(app.appType);
          const AppIcon = appInfo.icon;
          
          return (
            <div 
              key={app._id} 
              className={`${appInfo.bgColor} ${appInfo.borderColor} border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${appInfo.color} mr-3`}>
                    <AppIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{appInfo.title}</h3>
                    <p className="text-sm text-gray-600">Version {app.version}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Active</span>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{appInfo.description}</p>

              {app.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">What's New:</h4>
                  <p className="text-sm text-gray-600">{app.description}</p>
                </div>
              )}

              {app.features && app.features.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {app.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{app.downloadCount}</span> downloads
                </div>
                <button
                  onClick={() => handleDownload(app._id, app.fileName)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Download APK
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* No apps available */}
      {appVersions.length === 0 && (
        <div className="text-center py-12">
          <DevicePhoneMobileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Apps Available</h3>
          <p className="text-gray-600">
            Mobile apps are not currently available for download. Please check back later.
          </p>
        </div>
      )}

      {/* Additional Information */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Installation Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">For Android Users:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Download the APK file</li>
              <li>Enable "Install from Unknown Sources" in your device settings</li>
              <li>Open the downloaded APK file</li>
              <li>Follow the installation prompts</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">App Types:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><strong>Main App:</strong> Full features with offline search capabilities</li>
              <li><strong>Emergency App:</strong> Online-only version for emergency situations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownload;
