#!/usr/bin/env python3
"""
Batch Test Processor for Math Solver
Processes all images from test/tests directory and outputs results to test/tests_result
Uses Pix2Text for efficient formula recognition
"""
import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, List
from pix2text import Pix2Text
from datetime import datetime
import traceback
import matplotlib.pyplot as plt
from matplotlib import mathtext
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
from PIL import Image
import numpy as np

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('batch_processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BatchMathSolver:
    """Batch processor for math equation images using Pix2Text"""
    
    def __init__(self, input_dir: str = "test/tests", output_dir: str = "test/tests_result"):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        
        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Supported image formats
        self.supported_formats = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
        
        # Initialize Pix2Text
        logger.info("Initializing Pix2Text...")
        self.p2t = Pix2Text.from_config()
        logger.info("Pix2Text initialized successfully")
        
    def get_image_files(self) -> List[Path]:
        """Get all supported image files from input directory"""
        image_files = []
        
        if not self.input_dir.exists():
            logger.error(f"Input directory {self.input_dir} does not exist")
            return image_files
            
        for file_path in self.input_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in self.supported_formats:
                image_files.append(file_path)
                
        return sorted(image_files)
    
    def process_single_image(self, image_path: Path) -> Dict[str, Any]:
        """Process a single image using Pix2Text"""
        try:
            logger.info(f"Processing image: {image_path.name}")
            
            # Use Pix2Text to recognize formula
            formula_result = self.p2t.recognize_formula(
                str(image_path),
                save_analysis_res=str(self.output_dir / f"{image_path.stem}_analysis")
            )
            
            # Generate comparison image (original + LaTeX)
            comparison_image_path = None
            if formula_result:
                comparison_image_path = self.output_dir / f"{image_path.stem}_comparison.png"
                comparison_success = self.create_comparison_image(image_path, str(formula_result), comparison_image_path)
                if not comparison_success:
                    comparison_image_path = None
            
            # Create structured result
            result = {
                "image_filename": image_path.name,
                "processed_at": datetime.now().isoformat(),
                "status": "success",
                "formula_recognition": {
                    "detected_text": str(formula_result) if formula_result else "No formula detected",
                    "latex_format": str(formula_result) if formula_result else None,
                    "analysis_saved": str(self.output_dir / f"{image_path.stem}_analysis"),
                    "comparison_image": str(comparison_image_path) if comparison_image_path else None
                },
                "solution": {
                    "title": f"Formula Recognition for {image_path.name}",
                    "equations": [str(formula_result)] if formula_result else [],
                    "raw_output": str(formula_result) if formula_result else "No text detected",
                    "method": "Pix2Text OCR"
                }
            }
            
            logger.info(f"Successfully processed {image_path.name}: {formula_result}")
            if comparison_image_path:
                logger.info(f"Generated comparison image: {comparison_image_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing {image_path.name}: {e}")
            return {
                "image_filename": image_path.name,
                "processed_at": datetime.now().isoformat(),
                "status": "error",
                "error": str(e),
                "traceback": traceback.format_exc()
            }
    
    def sanitize_latex(self, latex_string: str) -> str:
        """Sanitize LaTeX string to work with matplotlib's limited parser"""
        import re
        
        latex_clean = latex_string.strip()
        
        # Handle complex matrix/array environments that matplotlib can't parse
        # Replace entire matrix blocks with simpler notation
        if r'\begin{matrix}' in latex_clean or r'\begin{array}' in latex_clean:
            # For matrices, just show a simplified representation
            latex_clean = re.sub(r'\\begin\{matrix\}.*?\\end\{matrix\}', r'[\\text{matrix}]', latex_clean, flags=re.DOTALL)
            latex_clean = re.sub(r'\\begin\{array\}.*?\\end\{array\}', r'[\\text{array}]', latex_clean, flags=re.DOTALL)
        
        # List of problematic commands to replace or remove
        replacements = {
            r'\hspace{1 c m}': r'\quad',
            r'\hspace{2 c m}': r'\qquad',
            r'{\cdots}': r'\cdots',
            r'{\ddots}': r'\ddots',
            r'{\vdots}': r'\vdots',
            r'{\ldots}': r'\ldots',
        }
        
        for old, new in replacements.items():
            latex_clean = latex_clean.replace(old, new)
        
        # Remove any remaining unsupported commands
        # Remove \hspace with any content in braces
        latex_clean = re.sub(r'\\hspace\{[^}]*\}', r'\\quad', latex_clean)
        
        # Remove other problematic environments
        latex_clean = re.sub(r'\\begin\{[^}]*\}', r'', latex_clean)
        latex_clean = re.sub(r'\\end\{[^}]*\}', r'', latex_clean)
        
        # Clean up multiple spaces and unnecessary characters
        latex_clean = re.sub(r'\s+', ' ', latex_clean)
        latex_clean = latex_clean.strip()
        
        return latex_clean
    
    def create_latex_image_fallback(self, latex_string: str, width: int, height: int) -> Image.Image:
        """Create a fallback image when LaTeX rendering fails"""
        # Create a simple text image
        img = Image.new('RGB', (width, height), 'white')
        
        try:
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(img)
            
            # Try to use a monospace font
            try:
                font = ImageFont.truetype("consola.ttf", 16)
            except:
                try:
                    font = ImageFont.truetype("arial.ttf", 16)
                except:
                    font = ImageFont.load_default()
            
            # Wrap text if too long
            text_lines = []
            if len(latex_string) > 50:
                words = latex_string.split()
                line = ""
                for word in words:
                    if len(line + word) < 50:
                        line += word + " "
                    else:
                        text_lines.append(line.strip())
                        line = word + " "
                if line:
                    text_lines.append(line.strip())
            else:
                text_lines = [latex_string]
            
            # Draw text centered
            y_offset = height // 2 - (len(text_lines) * 20) // 2
            for i, line in enumerate(text_lines):
                bbox = draw.textbbox((0, 0), line, font=font)
                text_width = bbox[2] - bbox[0]
                x = (width - text_width) // 2
                y = y_offset + i * 20
                draw.text((x, y), line, fill='black', font=font)
            
            # Add "LaTeX Render Failed" label
            label = "(LaTeX render failed - showing raw text)"
            bbox = draw.textbbox((0, 0), label, font=font)
            label_width = bbox[2] - bbox[0]
            draw.text((width - label_width - 10, height - 25), label, fill='red', font=font)
            
        except Exception as e:
            logger.warning(f"Fallback text rendering also failed: {e}")
        
        return img
    
    def create_comparison_image(self, original_image_path: Path, latex_string: str, output_path: Path) -> bool:
        """Create side-by-side comparison: original image (left) and rendered LaTeX (right)"""
        try:
            if not latex_string or latex_string == "No formula detected":
                return False
            
            # Load original image
            original_img = Image.open(original_image_path)
            if original_img.mode != 'RGB':
                original_img = original_img.convert('RGB')
            
            # Try to render LaTeX with error handling
            latex_img = None
            latex_success = False
            
            # First, try to sanitize and render the LaTeX
            try:
                latex_clean = self.sanitize_latex(latex_string)
                
                # If sanitization removed everything, use fallback
                if not latex_clean or latex_clean.isspace():
                    raise ValueError("LaTeX string became empty after sanitization")
                
                if not latex_clean.startswith('$'):
                    latex_clean = f'${latex_clean}$'
                
                logger.debug(f"Sanitized LaTeX: '{latex_string}' -> '{latex_clean}'")
                
                # Create LaTeX rendering
                fig, ax = plt.subplots(figsize=(6, 4), dpi=150)
                ax.text(0.5, 0.5, latex_clean, transform=ax.transAxes, 
                       fontsize=24, ha='center', va='center')
                ax.axis('off')
                ax.set_xlim(0, 1)
                ax.set_ylim(0, 1)
                
                # Save LaTeX to temporary buffer
                from io import BytesIO
                latex_buffer = BytesIO()
                fig.savefig(latex_buffer, bbox_inches='tight', 
                           facecolor='white', edgecolor='none', 
                           dpi=150, format='png')
                plt.close(fig)
                
                # Load LaTeX image from buffer
                latex_buffer.seek(0)
                latex_img = Image.open(latex_buffer)
                latex_success = True
                logger.info(f"Successfully rendered LaTeX: {latex_string[:50]}...")
                
            except Exception as latex_error:
                logger.warning(f"LaTeX rendering failed for '{latex_string[:50]}...': {latex_error}")
                plt.close('all')
                
                # Create fallback image
                latex_img = self.create_latex_image_fallback(latex_string, 600, 200)
                latex_success = True  # We have a fallback image
            
            # Calculate dimensions for side-by-side layout
            orig_width, orig_height = original_img.size
            latex_width, latex_height = latex_img.size
            
            # Make both images the same height
            target_height = max(orig_height, latex_height)
            
            # Resize images to same height while maintaining aspect ratio
            orig_ratio = orig_width / orig_height
            latex_ratio = latex_width / latex_height
            
            new_orig_width = int(target_height * orig_ratio)
            new_latex_width = int(target_height * latex_ratio)
            
            original_resized = original_img.resize((new_orig_width, target_height), Image.Resampling.LANCZOS)
            latex_resized = latex_img.resize((new_latex_width, target_height), Image.Resampling.LANCZOS)
            
            # Create comparison image
            padding = 20
            total_width = new_orig_width + new_latex_width + padding * 3
            total_height = target_height + padding * 2
            
            comparison_img = Image.new('RGB', (total_width, total_height), 'white')
            
            # Paste images
            comparison_img.paste(original_resized, (padding, padding))
            comparison_img.paste(latex_resized, (new_orig_width + padding * 2, padding))
            
            # Save the comparison image directly without matplotlib to avoid coordinate issues
            comparison_img.save(output_path, 'PNG', quality=95)
            
            # If we want to add labels, we can do it with PIL instead
            try:
                from PIL import ImageDraw, ImageFont
                
                # Add a margin at the top for labels
                label_height = 40
                final_img = Image.new('RGB', (total_width, total_height + label_height), 'white')
                final_img.paste(comparison_img, (0, label_height))
                
                draw = ImageDraw.Draw(final_img)
                
                # Try to get a decent font
                try:
                    font = ImageFont.truetype("arial.ttf", 16)
                except:
                    font = ImageFont.load_default()
                
                # Add labels
                draw.text((new_orig_width//2, 10), 'Original', fill='black', font=font, anchor='mt')
                draw.text((new_orig_width + padding + new_latex_width//2, 10), 'Rendered LaTeX', 
                         fill='black', font=font, anchor='mt')
                
                # Save the final image with labels
                final_img.save(output_path, 'PNG', quality=95)
                
            except Exception as label_error:
                logger.warning(f"Could not add labels to comparison image: {label_error}")
                # Fall back to saving without labels
                comparison_img.save(output_path, 'PNG', quality=95)
            
            logger.info(f"Created comparison image: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create comparison image: {e}")
            plt.close('all')
            return False
    
    def save_result(self, result: Dict[str, Any]) -> None:
        """Save processing result to JSON file"""
        filename = result["image_filename"]
        # Create output filename by replacing image extension with .json
        output_filename = Path(filename).stem + ".json"
        output_path = self.output_dir / output_filename
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved result to {output_path}")
        except Exception as e:
            logger.error(f"Failed to save result for {filename}: {e}")
    
    def process_all_images(self) -> Dict[str, Any]:
        """Process all images in the input directory"""
        image_files = self.get_image_files()
        
        if not image_files:
            logger.warning(f"No image files found in {self.input_dir}")
            return {
                "total_images": 0,
                "processed": 0,
                "failed": 0,
                "results": []
            }
        
        logger.info(f"Found {len(image_files)} image files to process")
        
        results = []
        processed_count = 0
        failed_count = 0
        
        # Process images one by one
        for i, image_path in enumerate(image_files, 1):
            logger.info(f"Processing {i}/{len(image_files)}: {image_path.name}")
            
            try:
                result = self.process_single_image(image_path)
                self.save_result(result)
                results.append(result)
                
                if result["status"] == "success":
                    processed_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Critical error processing {image_path.name}: {e}")
                failed_result = {
                    "image_filename": image_path.name,
                    "processed_at": datetime.now().isoformat(),
                    "status": "critical_error",
                    "error": str(e)
                }
                self.save_result(failed_result)
                results.append(failed_result)
                failed_count += 1
        
        # Save summary report
        summary = {
            "batch_processing_summary": {
                "total_images": len(image_files),
                "processed_successfully": processed_count,
                "failed": failed_count,
                "processed_at": datetime.now().isoformat(),
                "input_directory": str(self.input_dir),
                "output_directory": str(self.output_dir)
            },
            "individual_results": results
        }
        
        summary_path = self.output_dir / "batch_summary.json"
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Batch processing complete. Summary saved to {summary_path}")
        logger.info(f"Results: {processed_count} successful, {failed_count} failed out of {len(image_files)} total")
        
        return summary
    
    def convert_existing_results_to_images(self) -> None:
        """Convert existing JSON results to comparison images"""
        logger.info("Converting existing results to comparison images...")
        
        # Find all JSON result files
        json_files = list(self.output_dir.glob("*.json"))
        if not json_files:
            logger.warning(f"No JSON result files found in {self.output_dir}")
            return
        
        converted_count = 0
        for json_file in json_files:
            # Skip summary files
            if json_file.name.startswith("batch_") or json_file.name.startswith("processing_"):
                continue
                
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    result = json.load(f)
                
                # Extract LaTeX string and original image
                latex_string = None
                if "formula_recognition" in result:
                    latex_string = result["formula_recognition"].get("latex_format")
                elif "formula_result" in result:
                    latex_string = result["formula_result"]
                
                original_image_name = result.get("image_filename")
                if not original_image_name:
                    continue
                
                # Find original image path
                original_image_path = self.input_dir / original_image_name
                
                if latex_string and latex_string != "No formula detected" and original_image_path.exists():
                    # Generate comparison image
                    stem = json_file.stem
                    comparison_image_path = self.output_dir / f"{stem}_comparison.png"
                    
                    if self.create_comparison_image(original_image_path, latex_string, comparison_image_path):
                        # Update the JSON result to include the image path
                        if "formula_recognition" in result:
                            result["formula_recognition"]["comparison_image"] = str(comparison_image_path)
                        else:
                            result["comparison_image"] = str(comparison_image_path)
                        
                        # Save updated result
                        with open(json_file, 'w', encoding='utf-8') as f:
                            json.dump(result, f, indent=2, ensure_ascii=False)
                        
                        converted_count += 1
                        logger.info(f"Converted {json_file.name} -> {comparison_image_path.name}")
                    else:
                        logger.warning(f"Failed to create comparison image for {json_file.name}")
                else:
                    if not latex_string or latex_string == "No formula detected":
                        logger.debug(f"No valid LaTeX found in {json_file.name}")
                    elif not original_image_path.exists():
                        logger.warning(f"Original image not found for {json_file.name}: {original_image_path}")
                
            except Exception as e:
                logger.error(f"Error processing {json_file.name}: {e}")
        
        logger.info(f"Converted {converted_count} results to comparison images")

def main():
    """Main function to run batch processing"""
    print("Math Solver Batch Test Processor")
    print("=" * 50)
    
    import sys
    
    processor = BatchMathSolver()
    
    try:
        # Check if user wants to convert existing results
        if len(sys.argv) > 1 and sys.argv[1] == "--convert-existing":
            print("Processing test images directly to create comparison images...")
            summary = processor.process_all_images()
            print(f"Processed {summary['batch_processing_summary']['total_images']} images")
            print("Conversion complete!")
            return
        
        # Normal processing
        summary = processor.process_all_images()
        
        print(f"\nBatch Processing Complete!")
        print(f"Total images: {summary['batch_processing_summary']['total_images']}")
        print(f"Successful: {summary['batch_processing_summary']['processed_successfully']}")
        print(f"Failed: {summary['batch_processing_summary']['failed']}")
        print(f"Results saved to: {processor.output_dir}")
        
        # Also convert existing results to comparison images
        print(f"\nCreating comparison images...")
        processor.convert_existing_results_to_images()
        
    except KeyboardInterrupt:
        print("\n\nProcessing interrupted by user")
    except Exception as e:
        logger.error(f"Critical error in main: {e}")
        print(f"Critical error: {e}")

if __name__ == "__main__":
    main()
