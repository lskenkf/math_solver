/**
 * Math Solver API Service
 * Handles communication with the FastAPI backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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

// Streaming interfaces
export interface StreamChunk {
  chunk: string;
  problem_id: string;
}

export interface StreamFullResponse {
  full_response: string;
  problem_id: string;
}

export interface StreamError {
  error: string;
}

export type StreamEvent = StreamChunk | StreamFullResponse | StreamError;

export interface StreamingSolutionState {
  isStreaming: boolean;
  currentChunks: string[];
  fullResponse: string | null;
  problemId: string | null;
  error: string | null;
}

class MathSolverApiService {
  private baseUrl = 'http://192.168.178.31:8000'; // Use your computer's IP address
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
    console.log(`🔑 Token value: ${this.accessToken ? 'Present' : 'Missing'}`);
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
   * Verify that the current token is valid by making a test API call
   */
  async verifyToken(): Promise<boolean> {
    try {
      await this.waitForInitialization();
      
      if (!this.accessToken) {
        console.log('🔍 No token to verify');
        return false;
      }
      
      console.log('🔍 Verifying token with backend...');
      const response = await this.fetchWithTimeout(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('✅ Token verification successful');
        return true;
      } else {
        console.log('❌ Token verification failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return false;
    }
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
   * Force re-authentication by clearing stored tokens
   */
  async forceReauth(): Promise<void> {
    console.log('🔄 Forcing re-authentication...');
    this.accessToken = null;
    await this.removeStoredToken();
    console.log('✅ Stored tokens cleared, ready for re-authentication');
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
   * Perform an SSE POST using XMLHttpRequest for React Native to get incremental progress.
   * Falls back to fetch where XHR is not available.
   */
  private async ssePostXHR(
    url: string,
    headers: Record<string, string>,
    body: any,
    onEvent: (event: any) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        let lastIndex = 0;

        const processDelta = () => {
          const text = xhr.responseText || '';
          if (text.length <= lastIndex) return;
          const newChunk = text.substring(lastIndex);
          lastIndex = text.length;
          const lines = newChunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.substring(6);
              try {
                const evt = JSON.parse(jsonStr);
                onEvent(evt);
              } catch {
                // ignore parse errors for partial lines
              }
            }
          }
        };

        xhr.onreadystatechange = () => {
          // readyState 3: LOADING, 4: DONE
          if (xhr.readyState === 3 || xhr.readyState === 4) {
            processDelta();
          }
          if (xhr.readyState === 4) {
            // completed
            if (xhr.status >= 200 && xhr.status < 300) {
              onComplete();
              resolve();
            } else {
              const err = `SSE request failed: ${xhr.status} - ${xhr.responseText}`;
              onError(err);
              reject(new Error(err));
            }
          }
        };

        // Some platforms stream only via progress events
        xhr.onprogress = () => {
          processDelta();
        };

        xhr.onerror = () => {
          const err = 'Network error during SSE request';
          onError(err);
          reject(new Error(err));
        };

        xhr.open('POST', url, true);
        // Required to avoid response decoding that buffers
        try { xhr.overrideMimeType('text/plain; charset=x-user-defined'); } catch {}
        // Set headers
        xhr.setRequestHeader('Accept', 'text/event-stream');
        for (const [k, v] of Object.entries(headers)) {
          xhr.setRequestHeader(k, v);
        }
        xhr.send(body);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown XHR error';
        onError(msg);
        reject(error as any);
      }
    });
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

  /**
   * Solve a math equation from an image with streaming
   * @param imageUri URI of the image containing the math equation
   * @param onChunk Callback for each stream chunk
   * @param onComplete Callback when streaming is complete
   * @param onError Callback for streaming errors
   * @returns Promise that resolves when streaming is complete
   */
  async solveMathFromImageStream(
    imageUri: string,
    onChunk: (chunk: string, problemId: string) => void,
    onComplete: (fullResponse: string, problemId: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    return this.callServer(async (url) => {
      // Create form data
      const formData = new FormData();
      
      // Add the image to form data with the correct field name expected by backend
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'math_equation.jpg',
      } as any);

      console.log('📡 Starting streaming request to:', `${url}/solve/stream`);

      try {
        // On native, prefer XHR for incremental progress
        if (Platform.OS !== 'web') {
          await this.ssePostXHR(
            `${url}/solve/stream`,
            this.getAuthHeaders(),
            formData as any,
            (event: StreamEvent) => {
              if ('chunk' in event) {
                onChunk(event.chunk, event.problem_id);
              } else if ('full_response' in event) {
                onComplete(event.full_response, event.problem_id);
              } else if ('error' in event) {
                onError(event.error);
              }
            },
            (err) => onError(err),
            () => {}
          );
          return;
        }

        // Web: use fetch streaming
        const response = await fetch(`${url}/solve/stream`, {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders(),
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          body: formData,
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        console.log('📡 Response ok:', response.ok);
        console.log('📡 Response body exists:', !!response.body);
        console.log('📡 Content-Type:', response.headers.get('content-type'));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Streaming request failed:', response.status, errorText);
          throw new Error(`Streaming request failed: ${response.status} - ${errorText}`);
        }

        // For streaming responses, we need to handle the case where response.body might not be detected
        // but the response is actually streaming
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
          console.log('📡 Detected streaming response, proceeding...');
        } else if (!response.body) {
          console.error('❌ No response body for streaming');
          throw new Error('No response body for streaming');
        }

        // Try to get the reader, fallback to text() if body is not available
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        
        if (response.body) {
          reader = response.body.getReader();
        } else if (response.headers.get('content-type')?.includes('text/event-stream')) {
          // For streaming responses without detectable body, try to read as text
          console.log('📡 Using text() fallback for streaming response');
          const text = await response.text();
          console.log('📡 Received text response:', text);
          
          // Process the text as if it were streaming data
          const lines = text.split('\n');
          let accumulatedResponse = '';
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonData = trimmedLine.substring(6);
                const event: StreamEvent = JSON.parse(jsonData);
                
                if ('chunk' in event) {
                  console.log('📝 Received chunk:', event.chunk);
                  accumulatedResponse += event.chunk;
                  onChunk(event.chunk, event.problem_id);
                } else if ('full_response' in event) {
                  console.log('✅ Received full response, length:', event.full_response.length);
                  onComplete(event.full_response, event.problem_id);
                  return;
                } else if ('error' in event) {
                  console.error('❌ Stream error:', event.error);
                  onError(event.error);
                  return;
                }
              } catch (parseError) {
                console.warn('⚠️ Failed to parse stream event:', trimmedLine, parseError);
              }
            }
          }
          return;
        } else {
          throw new Error('No response body for streaming');
        }

        // If we have a reader, use the streaming approach
        if (reader) {
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulatedResponse = '';

          console.log('📡 Stream started, reading chunks...');

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('📡 Stream completed');
              break;
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ')) {
                try {
                  const jsonData = trimmedLine.substring(6); // Remove 'data: ' prefix
                  const event: StreamEvent = JSON.parse(jsonData);
                  
                  if ('chunk' in event) {
                    console.log('📝 Received chunk:', event.chunk);
                    accumulatedResponse += event.chunk;
                    onChunk(event.chunk, event.problem_id);
                  } else if ('full_response' in event) {
                    console.log('✅ Received full response, length:', event.full_response.length);
                    onComplete(event.full_response, event.problem_id);
                    return; // Exit the streaming loop
                  } else if ('error' in event) {
                    console.error('❌ Stream error:', event.error);
                    onError(event.error);
                    return; // Exit the streaming loop
                  }
                } catch (parseError) {
                  console.warn('⚠️ Failed to parse stream event:', trimmedLine, parseError);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Streaming error:', error);
        onError(error instanceof Error ? error.message : 'Unknown streaming error');
        throw error;
      }
    });
  }

  /**
   * Test if the streaming endpoint is available
   */
  async testStreamingEndpoint(): Promise<boolean> {
    try {
      console.log('🔍 Testing streaming endpoint availability...');
      
      // Try to make a GET request to the root endpoint to check if server is up
      const rootResponse = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!rootResponse.ok) {
        console.log('❌ Server not responding');
        return false;
      }
      
      const rootData = await rootResponse.json();
      const hasStreamingEndpoint = rootData.endpoints && rootData.endpoints['POST /solve/stream'];
      
      console.log(`📡 Streaming endpoint test result: ${hasStreamingEndpoint ? 'Available' : 'Not Found'}`);
      return hasStreamingEndpoint;
    } catch (error) {
      console.error('❌ Error testing streaming endpoint:', error);
      return false;
    }
  }

  /**
   * Send a text message to ChatGPT and get response
   */
  async sendChatMessage(message: string): Promise<string> {
    return this.callServer(async (url) => {
      console.log('💬 Sending chat message:', message);
      
      const response = await fetch(`${url}/chat`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.response;
    });
  }

  /**
   * Stream a text chat message response via SSE
   */
  async sendChatMessageStream(
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    return this.callServer(async (url) => {
      try {
        if (Platform.OS !== 'web') {
          await this.ssePostXHR(
            `${url}/chat/stream`,
            {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            JSON.stringify({ message }),
            (evt: any) => {
              if ('chunk' in evt) onChunk(evt.chunk);
              else if ('full_response' in evt) onComplete(evt.full_response);
              else if ('error' in evt) onError(evt.error);
            },
            (err) => onError(err),
            () => {}
          );
          return;
        }

        const response = await fetch(`${url}/chat/stream`, {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Streaming chat failed: ${response.status} - ${errorText}`);
        }

        if (!response.body) {
          // Fallback: try text parse if body missing but SSE returned
          const text = await response.text();
          for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const evt = JSON.parse(trimmed.substring(6));
                if ('chunk' in evt) onChunk(evt.chunk);
                if ('full_response' in evt) { onComplete(evt.full_response); return; }
                if ('error' in evt) { onError(evt.error); return; }
              } catch {}
            }
          }
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const evt = JSON.parse(trimmed.substring(6));
                if ('chunk' in evt) { accumulated += evt.chunk; onChunk(evt.chunk); }
                else if ('full_response' in evt) { onComplete(evt.full_response); return; }
                else if ('error' in evt) { onError(evt.error); return; }
              } catch {}
            }
          }
        }
        // If stream ended without explicit full_response, use accumulated
        if (accumulated) onComplete(accumulated);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Unknown streaming error');
        throw error;
      }
    });
  }

  /**
   * Send an image to ChatGPT and get response
   */
  async sendImageMessage(imageUri: string): Promise<string> {
    return this.callServer(async (url) => {
      console.log('📸 Sending image message');
      
      const formData = new FormData();
      formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'math_equation.jpg' } as any);

      const response = await fetch(`${url}/solve/image`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.response;
    });
  }
}

// Export a singleton instance
export const mathSolverApi = new MathSolverApiService();
export default mathSolverApi;
