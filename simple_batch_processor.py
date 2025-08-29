#!/usr/bin/env python3
"""
Simple Batch Test Processor for Math Solver
Processes all images from test/tests directory and outputs results to test/tests_result
Based on the Untitled-1.ipynb notebook approach
"""
import json
import os
from pathlib import Path
from datetime import datetime
from pix2text import Pix2Text

def process_test_images():
    """Process all test images using Pix2Text"""
    
    # Setup directories
    input_dir = Path("test/tests")
    output_dir = Path("test/tests_result")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize Pix2Text (same as notebook)
    print("Initializing Pix2Text...")
    p2t = Pix2Text.from_config()
    print("Pix2Text initialized successfully")
    
    # Get all image files
    image_files = []
    supported_formats = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
    
    if not input_dir.exists():
        print(f"Error: Input directory {input_dir} does not exist")
        return
    
    for file_path in input_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in supported_formats:
            image_files.append(file_path)
    
    if not image_files:
        print(f"No image files found in {input_dir}")
        return
    
    print(f"Found {len(image_files)} images to process")
    
    # Process each image
    results = []
    
    for i, img_path in enumerate(sorted(image_files), 1):
        print(f"\nProcessing {i}/{len(image_files)}: {img_path.name}")
        
        try:
            # Use Pix2Text exactly like in the notebook
            out = p2t.recognize_formula(
                str(img_path),
                save_analysis_res=str(output_dir / f"{img_path.stem}_analysis")
            )
            
            # Create result
            result = {
                "image_filename": img_path.name,
                "processed_at": datetime.now().isoformat(),
                "status": "success",
                "formula_result": str(out) if out else "No formula detected",
                "analysis_dir": str(output_dir / f"{img_path.stem}_analysis")
            }
            
            print(f"Result: {result['formula_result']}")
            
        except Exception as e:
            print(f"Error processing {img_path.name}: {e}")
            result = {
                "image_filename": img_path.name,
                "processed_at": datetime.now().isoformat(),
                "status": "error",
                "error": str(e)
            }
        
        results.append(result)
        
        # Save individual result
        output_file = output_dir / f"{img_path.stem}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Saved result to {output_file}")
    
    # Save summary
    summary = {
        "processing_summary": {
            "total_images": len(image_files),
            "successful": sum(1 for r in results if r["status"] == "success"),
            "failed": sum(1 for r in results if r["status"] == "error"),
            "processed_at": datetime.now().isoformat()
        },
        "results": results
    }
    
    summary_file = output_dir / "processing_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== Processing Complete ===")
    print(f"Total: {summary['processing_summary']['total_images']}")
    print(f"Successful: {summary['processing_summary']['successful']}")
    print(f"Failed: {summary['processing_summary']['failed']}")
    print(f"Results saved to: {output_dir}")
    print(f"Summary saved to: {summary_file}")

if __name__ == "__main__":
    print("Simple Math Solver Batch Processor")
    print("=" * 40)
    process_test_images()
