// Backend configuration
export const BACKEND_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Helper function to get full image URL
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // If the path already starts with http, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If the path starts with /, append to backend base URL
  if (imagePath.startsWith('/')) {
    const fullUrl = `${BACKEND_BASE_URL}${imagePath}`;
    console.log('🔗 Generated image URL:', fullUrl);
    return fullUrl;
  }
  
  // Otherwise, append to backend base URL with /
  const fullUrl = `${BACKEND_BASE_URL}/${imagePath}`;
  console.log('🔗 Generated image URL:', fullUrl);
  return fullUrl;
};

// Helper function to get download URL for app files
export const getAppDownloadUrl = (appId: string): string => {
  return `${BACKEND_BASE_URL}/api/app-management/download/${appId}`;
};
