/**
 * API Configuration
 * Smart configuration that automatically detects the correct backend URL for local development
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Function to get the correct local backend URL based on platform
const getLocalBackendUrl = (): string => {
  const port = 8000;
  
  if (Platform.OS === 'web') {
    // For web, use localhost
    return `http://localhost:${port}`;
  }
  
  if (__DEV__) {
    // In development mode, try to get the debugger host
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    
    if (debuggerHost) {
      // Use the same IP as the Metro bundler
      return `http://${debuggerHost}:${port}`;
    }
    
    // For all platforms, prefer localhost first
    return `http://localhost:${port}`;
  }
  
  // Production fallback
  return `http://localhost:${port}`;
};

// Production backend server IP - ONLY this server will be used
const BACKEND_SERVER_IP = '37.60.234.118';

// API Configuration - ONLY uses production server, no fallbacks
export const API_CONFIG = {
  // ONLY use the production server
  BASE_URL: `http://${BACKEND_SERVER_IP}:8000`,
  
  // Kept for compatibility but NOT used anymore - frontend uses ONLY the server above
  FALLBACK_URLS: [
    'http://192.168.178.31:8000',      // Previous local network IP (for dev)
    'http://localhost:8000',           // Local development
    'http://127.0.0.1:8000',           // Alternative localhost format
    'http://10.0.2.2:8000',            // Android emulator
  ],
  
  // Timeout for API requests (in milliseconds) - 95 seconds to allow backend 90s + 5s buffer
  TIMEOUT: 95000,
  
  // Maximum file size for uploads (in bytes) - 10MB
  MAX_FILE_SIZE: 10 * 1024 * 1024,
};

// Different configurations for different environments
export const ENVIRONMENTS = {
  development: {
    BASE_URL: `http://${BACKEND_SERVER_IP}:8000`, // Use your server in development too
    FALLBACK_URLS: API_CONFIG.FALLBACK_URLS,
    TIMEOUT: 95000,
  },
  staging: {
    BASE_URL: 'https://staging-api.yourapp.com',
    FALLBACK_URLS: [],
    TIMEOUT: 30000,
  },
  production: {
    BASE_URL: `http://${BACKEND_SERVER_IP}:8000`,
    FALLBACK_URLS: [],
    TIMEOUT: 95000,
  },
};

// Get configuration based on environment
export const getApiConfig = (environment: keyof typeof ENVIRONMENTS = 'development') => {
  return {
    ...API_CONFIG,
    ...ENVIRONMENTS[environment],
  };
};

// Debug function to see what URL is being used
export const getDebugInfo = () => {
  return {
    platform: Platform.OS,
    isDev: __DEV__,
    currentUrl: API_CONFIG.BASE_URL,
    fallbackUrls: API_CONFIG.FALLBACK_URLS,
    hostUri: Constants.expoConfig?.hostUri,
  };
};

export default API_CONFIG;
