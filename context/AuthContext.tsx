/**
 * Authentication Context
 * Manages authentication state across the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { mathSolverApi } from '@/services/mathSolverApi';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app start
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Give a small delay to ensure the service is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔍 Checking persistent authentication status...');
      
      // Check if user has a stored token and is authenticated
      const isAuth = await mathSolverApi.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        console.log('✅ User is authenticated with persistent token');
      } else {
        console.log('ℹ️ User is not authenticated - login required');
      }
      
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthenticated = (value: boolean) => {
    setIsAuthenticated(value);
  };

  const setLoading = (value: boolean) => {
    setIsLoading(value);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      setAuthenticated,
      setLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
