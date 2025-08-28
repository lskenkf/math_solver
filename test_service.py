#!/usr/bin/env python3
"""
Test script for the Math Solver FastAPI service
"""
import requests
import os
from pathlib import Path

def test_math_solver_service():
    """Test the math solver service with example images"""
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed:", response.json())
        else:
            print("❌ Health check failed:", response.status_code)
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to the service. Make sure it's running on port 8000")
        return
    
    # Test solve-equation endpoint with example images
    test_images = [
        "test-pic-1.jpg",
        "examples/test-pic-1.jpg"
    ]
    
    for image_path in test_images:
        if os.path.exists(image_path):
            print(f"\nTesting with image: {image_path}")
            try:
                with open(image_path, "rb") as image_file:
                    files = {"image": ("image.jpg", image_file, "image/jpeg")}
                    response = requests.post(f"{base_url}/solve-equation", files=files)
                    
                if response.status_code == 200:
                    result = response.json()
                    print("✅ Successfully solved equation!")
                    print(f"Title: {result.get('title', 'N/A')}")
                    print(f"Equations: {result.get('equations', [])}")
                    print(f"Solution: {result.get('solution', {})}")
                    print(f"Steps: {len(result.get('steps', []))} steps")
                else:
                    print(f"❌ Failed to solve equation: {response.status_code}")
                    print(f"Error: {response.text}")
                    
            except Exception as e:
                print(f"❌ Error testing {image_path}: {e}")
        else:
            print(f"⚠️  Image not found: {image_path}")

if __name__ == "__main__":
    print("Math Solver Service Tester")
    print("=" * 40)
    test_math_solver_service()
