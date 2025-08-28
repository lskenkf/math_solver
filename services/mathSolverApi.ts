/**
 * Math Solver API Service
 * Handles communication with the FastAPI backend
 */

import { API_CONFIG } from '@/config/api';

export interface SolutionStep {
  description: string;
  calculation: string;
  result: string;
}

export interface Solution {
  x: number | null;
  y: number | null;
}

export interface MathSolutionResponse {
  title: string;
  equations: string[];
  steps: SolutionStep[];
  solution: Solution;
  verification: string;
}

export interface ApiError {
  detail: string;
}

class MathSolverApiService {
  private baseUrl = API_CONFIG.BASE_URL;
  private workingUrl: string | null = null; // Cache the working URL
  
  /**
   * Update the base URL for the API
   * @param url The new base URL
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
    this.workingUrl = null; // Reset working URL cache
  }

  /**
   * Create a fetch request with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = API_CONFIG.TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
      }
      throw error;
    }
  }

  /**
   * Try multiple URLs until one works
   */
  private async tryMultipleUrls<T>(
    operation: (url: string) => Promise<T>,
    urls: string[] = [this.baseUrl, ...API_CONFIG.FALLBACK_URLS]
  ): Promise<T> {
    // If we have a cached working URL, try it first
    if (this.workingUrl) {
      try {
        const result = await operation(this.workingUrl);
        return result;
      } catch (error) {
        console.log(`Cached URL ${this.workingUrl} failed, trying others...`);
        this.workingUrl = null;
      }
    }

    let lastError: Error | null = null;
    
    for (const url of urls) {
      try {
        console.log(`Trying backend URL: ${url}`);
        const result = await operation(url);
        
        // Cache the working URL for future requests
        this.workingUrl = url;
        this.baseUrl = url;
        
        console.log(`✅ Successfully connected to backend at: ${url}`);
        return result;
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}:`, error);
        lastError = error as Error;
        continue;
      }
    }
    
    throw new Error(`All backend URLs failed. Last error: ${lastError?.message}`);
  }

  /**
   * Check if the backend service is healthy
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    return this.tryMultipleUrls(async (url) => {
      const response = await this.fetchWithTimeout(`${url}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }, 5000); // 5 second timeout for health check
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      return await response.json();
    });
  }

  /**
   * Solve a math equation from an image
   * @param imageUri URI of the image containing the math equation
   * @returns Promise with the solution response
   */
  async solveMathFromImage(imageUri: string): Promise<MathSolutionResponse> {
    return this.tryMultipleUrls(async (url) => {
      // Create form data
      const formData = new FormData();
      
      // Add the image to form data
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'math_equation.jpg',
      } as any);

      // Make the API call with timeout
      const response = await this.fetchWithTimeout(`${url}/solve-equation`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }, 95000); // 95 second timeout for solving math problems (90s backend + 5s buffer)

      // Handle response
      if (response.ok) {
        const result: MathSolutionResponse = await response.json();
        return result;
      } else {
        // Handle API errors
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }
    });
  }

  /**
   * Solve a math equation from a file (for web/testing)
   * @param file File object containing the image
   * @returns Promise with the solution response
   */
  async solveMathFromFile(file: File): Promise<MathSolutionResponse> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${this.baseUrl}/solve-equation`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result: MathSolutionResponse = await response.json();
        return result;
      } else {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error solving math equation:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const mathSolverApi = new MathSolverApiService();
export default mathSolverApi;
