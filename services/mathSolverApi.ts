/**
 * Math Solver API Service
 * Handles communication with the FastAPI backend
 */

import { API_CONFIG } from '@/config/api';

// Backend response interface - matches what the backend actually returns
export interface BackendResponse {
  extracted_problem: string;
  step_by_step_solution: string;
}

// Frontend display interface - what our components expect
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
  problem_type: string;
  approach: string;
  extracted_problem: string;
  steps: SolutionStep[];
  solution: Solution;
  raw_response?: string; // Store the raw JSON response for debugging
}

export interface ApiError {
  detail: string;
}

class MathSolverApiService {
  private baseUrl = API_CONFIG.BASE_URL;
  private workingUrl: string | null = null; // Cache the working URL
  
  constructor() {
    // Log configuration on startup
    console.log('📡 Math Solver API Service Configuration:');
    console.log(`🎯 Primary URL: ${this.baseUrl}`);
    console.log(`🔄 Fallback URLs: ${API_CONFIG.FALLBACK_URLS.join(', ')}`);
  }
  
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
        console.log(`🔄 Trying backend URL: ${url}`);
        const result = await operation(url);
        
        // Cache the working URL for future requests
        this.workingUrl = url;
        this.baseUrl = url;
        
        console.log(`✅ Successfully connected to backend at: ${url}`);
        console.log(`🎯 This URL will be cached for future requests`);
        return result;
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}:`, error instanceof Error ? error.message : error);
        lastError = error as Error;
        continue;
      }
    }
    
    throw new Error(`All backend URLs failed. Last error: ${lastError?.message}`);
  }

  /**
   * Check if the backend service is healthy
   */
  async checkHealth(): Promise<{ message: string; status: string }> {
    return this.tryMultipleUrls(async (url) => {
      const response = await this.fetchWithTimeout(`${url}/`, {
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
   * Parse the backend JSON response into our frontend format
   */
  private parseBackendResponse(backendResponse: BackendResponse): MathSolutionResponse {
    const { extracted_problem, step_by_step_solution } = backendResponse;
    
    // Parse the GPT JSON response
    let gptResponse;
    try {
      gptResponse = JSON.parse(step_by_step_solution);
      console.log("✅ Parsed GPT response:", gptResponse);
    } catch (error) {
      console.warn("❌ Failed to parse GPT response as JSON:", error);
      console.log("📄 Raw GPT response:", step_by_step_solution);
      // Fallback for non-JSON responses
      gptResponse = {
        problem_type: "Math Problem",
        approach: "AI Analysis",
        solution: [step_by_step_solution]
      };
    }
    
    // Extract the expected structure from GPT response
    const problemType = gptResponse.problem_type || "Math Problem";
    const approach = gptResponse.approach || "AI-generated solution";
    const solutionSteps = Array.isArray(gptResponse.solution) ? gptResponse.solution : [gptResponse.solution || "No solution provided"];
    
    // Convert solution steps to our frontend format
    const steps: SolutionStep[] = solutionSteps.map((stepText: string, index: number) => {
      const isLastStep = index === solutionSteps.length - 1;
      return {
        description: isLastStep ? "Final Answer" : `Step ${index + 1}`,
        calculation: stepText,
        result: isLastStep ? "✅ Complete" : "→ Continue"
      };
    });
    
    // Try to extract numerical solution from the final step
    const finalStep = solutionSteps[solutionSteps.length - 1] || "";
    const numericalSolution = this.extractNumericalSolution(finalStep);
    
    const mappedResult = {
      problem_type: problemType,
      approach: approach,
      extracted_problem: extracted_problem,
      steps: steps,
      solution: numericalSolution,
      raw_response: step_by_step_solution
    };
    
    console.log("🎯 Final mapped result for UI:", mappedResult);
    return mappedResult;
  }

  /**
   * Extract numerical solutions from the final step text
   */
  private extractNumericalSolution(finalStep: string): Solution {
    // Try to find x = value and y = value patterns
    const xMatch = finalStep.match(/x\s*=\s*([-+]?\d*\.?\d+(?:\/\d+)?)/i);
    const yMatch = finalStep.match(/y\s*=\s*([-+]?\d*\.?\d+(?:\/\d+)?)/i);
    
    return {
      x: xMatch ? this.parseFraction(xMatch[1]) : null,
      y: yMatch ? this.parseFraction(yMatch[1]) : null
    };
  }

  /**
   * Parse fractions like "25/16" into decimal numbers
   */
  private parseFraction(value: string): number | null {
    try {
      if (value.includes('/')) {
        const [numerator, denominator] = value.split('/');
        return parseInt(numerator) / parseInt(denominator);
      }
      return parseFloat(value);
    } catch {
      return null;
    }
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
      
      // Add the image to form data with the correct field name expected by backend
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'math_equation.jpg',
      } as any);

      // Make the API call with timeout - note: no Content-Type header for FormData
      const response = await this.fetchWithTimeout(`${url}/solve`, {
        method: 'POST',
        body: formData,
      }, 95000); // 95 second timeout for solving math problems (90s backend + 5s buffer)

      // Handle response
      if (response.ok) {
        const backendResult: BackendResponse = await response.json();
        // Convert backend response to frontend format
        const result = this.parseBackendResponse(backendResult);
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
    return this.tryMultipleUrls(async (url) => {
      const formData = new FormData();
      formData.append('file', file); // Use 'file' instead of 'image' to match backend

      const response = await this.fetchWithTimeout(`${url}/solve`, {
        method: 'POST',
        body: formData,
      }, 95000);

      if (response.ok) {
        const backendResult: BackendResponse = await response.json();
        const result = this.parseBackendResponse(backendResult);
        return result;
      } else {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }
    });
  }
}

// Export a singleton instance
export const mathSolverApi = new MathSolverApiService();
export default mathSolverApi;
