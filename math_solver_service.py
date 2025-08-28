# math_solver_service.py
import base64
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
from dotenv import load_dotenv
import os
from pydantic import BaseModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable is required")

client = OpenAI(api_key=api_key)

# Request queue to ensure only one OpenAI request at a time
request_queue = asyncio.Queue(maxsize=10)  # Allow up to 10 requests in queue
processing_lock = asyncio.Lock()

# Pydantic models for response validation
class SolutionStep(BaseModel):
    description: str
    calculation: str
    result: str

class Solution(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None

class MathSolutionResponse(BaseModel):
    title: str
    equations: List[str]
    steps: List[SolutionStep]
    solution: Solution
    verification: str

app = FastAPI(
    title="Math Solver API",
    description="API for solving mathematical equations from images using AI",
    version="1.0.0"
)

# Allow CORS so your React Native app can call it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to verify the service is running"""
    return {"status": "healthy", "service": "Math Solver API"}

async def process_openai_request(image_base64: str) -> Dict[str, Any]:
    """
    Process a single OpenAI request with 90-second timeout
    """
    try:
        # Call GPT with JSON-only prompt and 90-second timeout
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "You are a math assistant. Solve the equation in the image step by step. "
                                    "Return ONLY in JSON with this structure:\n\n"
                                    "{\n"
                                    "  \"title\": \"string\",\n"
                                    "  \"equations\": [\"string\"],\n"
                                    "  \"steps\": [{\"description\": \"string\", \"calculation\": \"string\", \"result\": \"string\"}],\n"
                                    "  \"solution\": {\"x\": \"number or null\", \"y\": \"number or null\"},\n"
                                    "  \"verification\": \"string\"\n"
                                    "}\n"
                                    "If no variables are solved, set x and y to null. "
                                    "Do not include any text outside the JSON."
                                )
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.1
            ),
            timeout=90.0  # 90 seconds (1.5 minutes) timeout
        )
        
        return response
        
    except asyncio.TimeoutError:
        logger.error("OpenAI request timed out after 90 seconds")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Request timed out after 90 seconds. The math problem might be too complex."
        )
    except Exception as e:
        logger.error(f"OpenAI request failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OpenAI request failed: {str(e)}"
        )

@app.post("/solve-equation", response_model=MathSolutionResponse)
async def solve_equation(image: UploadFile = File(...)):
    """
    Solve mathematical equations from an uploaded image using AI
    Ensures only one request is processed at a time with 90-second timeout
    
    Args:
        image: Image file containing mathematical equation(s)
        
    Returns:
        MathSolutionResponse: Structured solution with steps and verification
    """
    try:
        # Validate file type
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Check file size (limit to 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if image.size and image.size > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image file too large. Maximum size is 10MB"
            )
        
        logger.info(f"Processing image: {image.filename}, type: {image.content_type}")
        
        # Read and encode image as base64
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image file"
            )
            
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        # Ensure only one OpenAI request is processed at a time
        async with processing_lock:
            logger.info("Acquired processing lock - making OpenAI request")
            
            # Check if there are too many requests waiting
            if request_queue.qsize() >= 5:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests in queue. Please try again later."
                )
            
            # Process the OpenAI request with timeout
            response = await process_openai_request(image_base64)

        # Parse GPT output
        raw_output = response.choices[0].message.content
        logger.info(f"Received response from OpenAI: {len(raw_output) if raw_output else 0} characters")
        
        if not raw_output:
            logger.error("OpenAI returned empty response")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI returned empty response"
            )
        
        # Extract and clean JSON from OpenAI response
        def extract_json_from_response(response_text: str) -> str:
            """
            Extract JSON from OpenAI response that might contain markdown, 
            extra text, or other formatting
            """
            text = response_text.strip()
            
            # Remove common markdown code block patterns
            patterns_to_remove = [
                ('```json\n', '```'),
                ('```json', '```'),
                ('```\n', '```'),
                ('```', '```'),
                ('`', '`'),
            ]
            
            for start_pattern, end_pattern in patterns_to_remove:
                if start_pattern in text:
                    start_idx = text.find(start_pattern)
                    if start_idx != -1:
                        text = text[start_idx + len(start_pattern):]
                        end_idx = text.rfind(end_pattern)
                        if end_idx != -1:
                            text = text[:end_idx]
                        break
            
            # Find JSON object boundaries
            text = text.strip()
            
            # Look for the start of JSON object
            json_start = -1
            for i, char in enumerate(text):
                if char == '{':
                    json_start = i
                    break
            
            if json_start == -1:
                raise ValueError("No JSON object found in response")
            
            # Find the matching closing brace
            brace_count = 0
            json_end = -1
            for i in range(json_start, len(text)):
                if text[i] == '{':
                    brace_count += 1
                elif text[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break
            
            if json_end == -1:
                raise ValueError("Incomplete JSON object in response")
            
            return text[json_start:json_end].strip()
        
        try:
            cleaned_output = extract_json_from_response(raw_output)
            logger.info(f"Extracted JSON: {cleaned_output[:200]}...")
            solution_json = json.loads(cleaned_output)
        except ValueError as e:
            logger.error(f"Failed to extract JSON from response: {e}")
            logger.error(f"Raw OpenAI response: {raw_output}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not extract JSON from AI response: {str(e)}"
            )
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extracted JSON: {e}")
            logger.error(f"Raw OpenAI response: {raw_output}")
            logger.error(f"Extracted content: {cleaned_output}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Invalid JSON format from AI service: {str(e)}"
            )
        
        # Validate response structure
        try:
            validated_response = MathSolutionResponse(**solution_json)
            logger.info("Successfully processed math equation")
            return validated_response
        except Exception as e:
            logger.error(f"Response validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid response structure from AI service"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while processing the image"
        )

# Add startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Math Solver API starting up...")
    logger.info("OpenAI client initialized successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
