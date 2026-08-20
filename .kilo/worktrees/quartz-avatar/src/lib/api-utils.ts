import { AxiosError } from 'axios';
import apiClient from './api';

// Retry logic for failed requests
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    const axiosError = error as AxiosError;
    // Don't retry client errors (4xx)
    if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

// Format error message from API response
export const formatErrorMessage = (error: unknown, fallback: string = 'An error occurred'): string => {
  const axiosError = error as AxiosError;
  
  if (axiosError.response) {
    const data = axiosError.response.data as any;
    return data?.error || data?.message || fallback;
  }
  
  if (axiosError.message) {
    return axiosError.message;
  }
  
  return fallback;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token') || localStorage.getItem('demoMode') === 'true';
};

// Get current user role
export const getUserRole = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
};

// Format currency
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format date
export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Download file from blob
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Copy to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate phone
export const isValidPhone = (phone: string): boolean => {
  return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone);
};

export { apiClient };
export * from './api';
