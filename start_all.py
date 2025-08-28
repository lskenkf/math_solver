#!/usr/bin/env python3
"""
Comprehensive startup script for both backend and frontend
"""
import os
import sys
import subprocess
import time
import platform
from pathlib import Path

def check_backend_environment():
    """Check if the backend environment is properly set up"""
    print("🔍 Checking backend environment...")
    
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
    
    print("✅ Backend environment setup looks good!")
    return True

def check_frontend_environment():
    """Check if the frontend environment is set up"""
    print("🔍 Checking frontend environment...")
    
    # Check if package.json exists
    if not os.path.exists('package.json'):
        print("❌ package.json not found!")
        print("Make sure you're in the React Native project directory")
        return False
    
    # Check if node_modules exists
    if not os.path.exists('node_modules'):
        print("❌ node_modules not found!")
        print("Please run 'npm install' first")
        return False
    
    print("✅ Frontend environment setup looks good!")
    return True

def start_backend():
    """Start the FastAPI backend"""
    print("\n🚀 Starting Math Solver API backend...")
    print("📡 Backend will be available at: http://localhost:8000")
    print("📖 API documentation at: http://localhost:8000/docs")
    print("🏥 Health check at: http://localhost:8000/health")
    
    try:
        if platform.system() == "Windows":
            # Windows
            subprocess.Popen([
                sys.executable, "start_service.py"
            ], creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            # macOS/Linux
            subprocess.Popen([
                "gnome-terminal", "--", sys.executable, "start_service.py"
            ])
        
        print("✅ Backend started in new terminal window")
        return True
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False

def start_frontend():
    """Start the React Native frontend"""
    print("\n📱 Starting React Native frontend...")
    print("📡 Metro bundler will start shortly...")
    
    try:
        if platform.system() == "Windows":
            # Windows
            subprocess.Popen([
                "cmd", "/c", "start", "cmd", "/k", "npm start"
            ], shell=True)
        else:
            # macOS/Linux
            subprocess.Popen([
                "gnome-terminal", "--", "npm", "start"
            ])
        
        print("✅ Frontend started in new terminal window")
        return True
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")
        return False

def print_instructions():
    """Print usage instructions"""
    print("\n" + "="*60)
    print("🎉 MATH SOLVER APP STARTUP COMPLETE!")
    print("="*60)
    print("\n📋 SERVICES RUNNING:")
    print("   🔧 Backend API: http://localhost:8000")
    print("   📱 Frontend App: Check Metro bundler terminal")
    print("\n📖 USEFUL LINKS:")
    print("   📚 API Docs: http://localhost:8000/docs")
    print("   🏥 Health Check: http://localhost:8000/health")
    print("\n📱 RUNNING THE APP:")
    print("   📱 Press 'i' in Metro terminal for iOS simulator")
    print("   🤖 Press 'a' in Metro terminal for Android emulator") 
    print("   🌐 Press 'w' in Metro terminal for web browser")
    print("\n🛑 TO STOP SERVICES:")
    print("   • Press Ctrl+C in each terminal window")
    print("   • Or close the terminal windows")
    print("\n🔧 TROUBLESHOOTING:")
    print("   • If backend fails: Check .env file and OpenAI API key")
    print("   • If frontend fails: Run 'npm install' and try again")
    print("   • For device testing: Update BASE_URL in config/api.ts")

def main():
    """Main startup function"""
    print("🚀 MATH SOLVER APP STARTUP")
    print("="*40)
    
    # Check environments
    backend_ok = check_backend_environment()
    frontend_ok = check_frontend_environment()
    
    if not backend_ok or not frontend_ok:
        print("\n❌ Environment check failed. Please fix the issues above.")
        sys.exit(1)
    
    # Start services
    print("\n🎬 Starting services...")
    
    backend_started = start_backend()
    if backend_started:
        print("⏳ Waiting 3 seconds for backend to initialize...")
        time.sleep(3)
    
    frontend_started = start_frontend()
    
    if backend_started and frontend_started:
        time.sleep(2)
        print_instructions()
    else:
        print("\n❌ Some services failed to start. Check the error messages above.")

if __name__ == "__main__":
    main()
