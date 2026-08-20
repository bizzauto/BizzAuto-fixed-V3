// Global toast helper - can be used anywhere in the app
import apiClient from './api';

export interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Simple toast utility (fallback when toast context is not available)
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    console.log(`[SUCCESS] ${message}`, options);
    // In components with access to toast context, use the useToast hook instead
  },
  error: (message: string, options?: ToastOptions) => {
    console.error(`[ERROR] ${message}`, options);
  },
  warning: (message: string, options?: ToastOptions) => {
    console.warn(`[WARNING] ${message}`, options);
  },
  info: (message: string, options?: ToastOptions) => {
    console.info(`[INFO] ${message}`, options);
  },
};

// Helper to show API error messages
export const showApiError = (error: any, fallback: string = 'Request failed') => {
  const message = error?.response?.data?.error || error?.message || fallback;
  toast.error(message);
};

// Helper to show success messages
export const showSuccess = (message: string) => {
  toast.success(message);
};

// Confirmation dialog
export const confirmAction = (
  message: string,
  title: string = 'Confirm Action'
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.confirm(`${title}\n\n${message}`)) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

// Export apiClient for use in components without importing it separately
export { apiClient };

// Helper to handle file upload
export const uploadFile = async (
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>
) => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
  }

  const response = await apiClient.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Helper to download files
export const downloadFile = async (url: string, filename?: string) => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};
