#!/usr/bin/env python3
"""
Startup script for the Math Solver FastAPI service
"""
import os
import sys
from pathlib import Path

def check_environment():
    """Check if the environment is properly set up"""
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("❌ .env file not found!")
        print("Please create a .env file with your OPENAI_API_KEY:")
        print("OPENAI_API_KEY=your_api_key_here")
        return False
    
    # Check if OPENAI_API_KEY is set
    from dotenv import load_dotenv
    load_dotenv()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found in .env file!")
        print("Please add your OpenAI API key to the .env file:")
        print("OPENAI_API_KEY=your_api_key_here")
        return False
    
    print("✅ Environment setup looks good!")
    return True

def start_service():
    """Start the FastAPI service"""
    if not check_environment():
        sys.exit(1)
    
    print("🚀 Starting Math Solver API service...")
    print("📡 Service will be available at: http://localhost:8000")
    print("📖 API documentation at: http://localhost:8000/docs")
    print("🏥 Health check at: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop the service")
    
    import uvicorn
    
    uvicorn.run(
        "math_solver_service:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )

if __name__ == "__main__":
    start_service()
