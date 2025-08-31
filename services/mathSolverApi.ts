/**
 * Math Solver API Service
 * Handles communication with the FastAPI backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';

// Backend response interface - matches what the backend actually returns
export interface BackendResponse {
  id: string;
  math_equation: string;
  chatgpt_response: string;
  status: string;
  created_at: string;
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
  private baseUrl = 'http://37.60.234.118:8000'; // Force your server URL
  private workingUrl: string | null = null; // Cache the working URL
  private accessToken: string | null = null; // Store auth token
  private isInitialized = false;
  
  constructor() {
    // Log configuration on startup
    console.log('📡 Math Solver API Service Configuration:');
    console.log(`🎯 Server URL: ${this.baseUrl}`);
    console.log(`🌍 Environment: ${__DEV__ ? 'development' : 'production'}`);
    console.log('🔒 Using ONLY the production server - no fallbacks');
    
    // Initialize token from storage (non-blocking)
    this.initializeFromStorage().catch(error => {
      console.error('❌ Error during service initialization:', error);
      this.isInitialized = true; // Mark as initialized even if storage fails
    });
    
    // Debug: Log available methods
    console.log('🔧 Service methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
    console.log('🔧 isAuthenticated method type:', typeof this.isAuthenticated);
  }

  /**
   * Initialize the service by loading stored tokens
   */
  private async initializeFromStorage(): Promise<void> {
    try {
      console.log('🔄 Initializing service - loading token from storage...');
      const storedToken = await AsyncStorage.getItem('access_token');
      if (storedToken) {
        this.accessToken = storedToken;
        console.log('🔑 Successfully loaded persistent authentication token');
      } else {
        console.log('ℹ️ No stored authentication token found - user needs to login');
      }
    } catch (error) {
      console.error('❌ Error loading stored token:', error);
    } finally {
      this.isInitialized = true;
      console.log('✅ Service initialization complete');
    }
  }

  /**
   * Wait for initialization to complete
   */
  private async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;
    
    // Wait for initialization with timeout
    let attempts = 0;
    while (!this.isInitialized && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.isInitialized) {
      console.warn('⚠️ Service initialization timeout');
    }
  }

  /**
   * Store token persistently
   */
  private async storeToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('access_token', token);
      console.log('💾 Token stored successfully');
    } catch (error) {
      console.error('❌ Error storing token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Remove stored token
   */
  private async removeStoredToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('access_token');
      console.log('🗑️ Stored token removed');
    } catch (error) {
      console.error('❌ Error removing stored token:', error);
    }
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
   * Set authentication token and store it persistently
   */
  async setAuthToken(token: string | null): Promise<void> {
    this.accessToken = token;
    
    if (token) {
      await this.storeToken(token);
      console.log('🔑 Auth token set and stored persistently');
    } else {
      await this.removeStoredToken();
      console.log('🔑 Auth token cleared and removed from storage');
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // Always wait for initialization to complete
    await this.waitForInitialization();
    
    // If we don't have a token in memory, try to load from storage one more time
    if (!this.accessToken) {
      try {
        const storedToken = await AsyncStorage.getItem('access_token');
        if (storedToken) {
          this.accessToken = storedToken;
          console.log('🔄 Restored token from storage');
        }
      } catch (error) {
        console.error('❌ Error loading token from storage:', error);
      }
    }
    
    const isAuth = !!this.accessToken;
    console.log(`🔑 Authentication check: ${isAuth ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}`);
    return isAuth;
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    await this.waitForInitialization();
    return this.accessToken;
  }

  /**
   * Logout user and clear stored token
   */
  async logout(): Promise<void> {
    console.log('🚪 Logging out user...');
    
    // Clear token from memory
    this.accessToken = null;
    
    // Remove token from storage
    await this.removeStoredToken();
    
    console.log('👋 User logged out successfully - all tokens cleared');
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  /**
   * Create a fetch request with timeout and authentication
   */
  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = API_CONFIG.TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Add authentication headers
    const headers = {
      ...options.headers,
      ...this.getAuthHeaders(),
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
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
   * Make API call to the server (no fallbacks)
   */
  private async callServer<T>(
    operation: (url: string) => Promise<T>
  ): Promise<T> {
    try {
      console.log(`🔄 Connecting to server: ${this.baseUrl}`);
      const result = await operation(this.baseUrl);
      console.log(`✅ Successfully connected to server: ${this.baseUrl}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to connect to server ${this.baseUrl}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Check if the backend service is healthy
   */
  async checkHealth(): Promise<{ message: string; status: string }> {
    return this.callServer(async (url) => {
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
   * Register a new user
   */
  async register(userData: { username: string; email: string; password: string }): Promise<any> {
    return this.callServer(async (url) => {
      const response = await this.fetchWithTimeout(`${url}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Registration failed: ${response.status}`);
      }

      return await response.json();
    });
  }

  /**
   * Login user and get authentication token
   */
  async login(credentials: { username: string; password: string }): Promise<{ access_token: string; refresh_token: string; token_type: string }> {
    return this.callServer(async (url) => {
      const response = await this.fetchWithTimeout(`${url}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Login failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      // Automatically set and store the auth token
      await this.setAuthToken(tokens.access_token);
      
      return tokens;
    });
  }

  /**
   * Extract JSON from GPT response text
   */
  private extractJsonFromGptResponse(responseText: string): any {
    if (!responseText || responseText === 'undefined') {
      console.warn("⚠️ GPT response is empty or undefined");
      return null;
    }

    console.log("📝 Raw GPT response from backend:", responseText);
    
    // Try to parse as direct JSON first
    try {
      const parsed = JSON.parse(responseText);
      console.log("✅ Direct JSON parse successful:", parsed);
      return parsed;
    } catch (error) {
      console.log("⚠️ Direct JSON parse failed, attempting to extract JSON...");
    }

    // Try to extract JSON from markdown code blocks
    const jsonCodeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi;
    let match = jsonCodeBlockRegex.exec(responseText);
    
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        console.log("✅ Extracted JSON from code block:", parsed);
        return parsed;
      } catch (error) {
        console.warn("❌ Failed to parse extracted JSON from code block:", error);
      }
    }

    // Try to find JSON object in the text (look for { ... })
    const jsonObjectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const matches = responseText.match(jsonObjectRegex);
    
    if (matches) {
      // Try to parse each potential JSON object
      for (const potentialJson of matches) {
        try {
          const parsed = JSON.parse(potentialJson);
          console.log("✅ Extracted JSON object from text:", parsed);
          return parsed;
        } catch (error) {
          console.log("⚠️ Failed to parse potential JSON:", potentialJson);
        }
      }
    }

    // Try to extract content between specific markers
    const markerPatterns = [
      /```json\s*([\s\S]*?)\s*```/gi,
      /```\s*([\s\S]*?)\s*```/gi,
      /<json>([\s\S]*?)<\/json>/gi,
      /JSON:\s*([\s\S]*?)(?:\n\n|\n$|$)/gi
    ];

    for (const pattern of markerPatterns) {
      const match = pattern.exec(responseText);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          console.log("✅ Extracted JSON from marker pattern:", parsed);
          return parsed;
        } catch (error) {
          console.log("⚠️ Failed to parse JSON from marker pattern");
        }
      }
    }

    console.warn("❌ Could not extract valid JSON from GPT response");
    return null;
  }

  /**
   * Parse the backend JSON response into our frontend format
   */
  private parseBackendResponse(backendResponse: BackendResponse): MathSolutionResponse {
    const { math_equation, chatgpt_response } = backendResponse;
    
    console.log("🔍 Processing backend response:");
    console.log("📋 Math equation:", math_equation);
    console.log("🤖 ChatGPT response (raw):", chatgpt_response);
    
    // Extract and parse the GPT JSON response
    const gptResponse = this.extractJsonFromGptResponse(chatgpt_response);
    
    let finalGptResponse;
    if (gptResponse) {
      finalGptResponse = gptResponse;
      console.log("✅ Successfully processed GPT response:", finalGptResponse);
    } else {
      console.warn("⚠️ Using fallback response structure");
      // Fallback for when we can't extract JSON
      finalGptResponse = {
        problem_type: "Math Problem",
        approach: "AI Analysis",
        solution: chatgpt_response ? [chatgpt_response] : ["Unable to process the response"]
      };
    }
    
    // Extract the expected structure from GPT response
    const problemType = finalGptResponse.problem_type || "Math Problem";
    const approach = finalGptResponse.approach || "AI-generated solution";
    const solutionSteps = Array.isArray(finalGptResponse.solution) ? finalGptResponse.solution : [finalGptResponse.solution || "No solution provided"];
    
    // Convert solution steps to our frontend format
    const steps: SolutionStep[] = solutionSteps.map((stepText: string, index: number) => {
      const isLastStep = index === solutionSteps.length - 1;
      return {
        description: isLastStep ? "Final Answer" : `Step ${index + 1}`,
        calculation: stepText,
        result: isLastStep ? "✅ Complete" : ""
      };
    });
    
    // Try to extract numerical solution from the final step
    const finalStep = solutionSteps[solutionSteps.length - 1] || "";
    const numericalSolution = this.extractNumericalSolution(finalStep);
    
    const mappedResult = {
      problem_type: problemType,
      approach: approach,
      extracted_problem: math_equation,
      steps: steps,
      solution: numericalSolution,
      raw_response: chatgpt_response
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
    return this.callServer(async (url) => {
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
        console.log("📦 Backend response received:", backendResult);
        
        // Validate backend response
        if (!backendResult.chatgpt_response) {
          console.warn("⚠️ Backend response missing chatgpt_response");
          throw new Error("Backend returned incomplete response");
        }
        
        if (backendResult.status !== "completed") {
          console.warn("⚠️ Backend response status not completed:", backendResult.status);
          throw new Error(`Backend processing not completed: ${backendResult.status}`);
        }
        
        // Convert backend response to frontend format
        const result = this.parseBackendResponse(backendResult);
        console.log("🎯 Final processed result:", result);
        return result;
      } else {
        // Handle API errors
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          console.warn("Failed to parse error response:", parseError);
        }
        
        console.error("❌ API call failed:", errorMessage);
        throw new Error(errorMessage);
      }
    });
  }

  /**
   * Solve a math equation from a file (for web/testing)
   * @param file File object containing the image
   * @returns Promise with the solution response
   */
  async solveMathFromFile(file: File): Promise<MathSolutionResponse> {
    return this.callServer(async (url) => {
      const formData = new FormData();
      formData.append('file', file); // Use 'file' instead of 'image' to match backend

      const response = await this.fetchWithTimeout(`${url}/solve`, {
        method: 'POST',
        body: formData,
      }, 95000);

      if (response.ok) {
        const backendResult: BackendResponse = await response.json();
        console.log("📦 Backend response received (file upload):", backendResult);
        
        // Validate backend response
        if (!backendResult.chatgpt_response) {
          console.warn("⚠️ Backend response missing chatgpt_response");
          throw new Error("Backend returned incomplete response");
        }
        
        if (backendResult.status !== "completed") {
          console.warn("⚠️ Backend response status not completed:", backendResult.status);
          throw new Error(`Backend processing not completed: ${backendResult.status}`);
        }
        
        const result = this.parseBackendResponse(backendResult);
        console.log("🎯 Final processed result (file upload):", result);
        return result;
      } else {
        // Handle API errors
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          console.warn("Failed to parse error response:", parseError);
        }
        
        console.error("❌ API call failed (file upload):", errorMessage);
        throw new Error(errorMessage);
      }
    });
  }
}

// Export a singleton instance
export const mathSolverApi = new MathSolverApiService();
export default mathSolverApi;
