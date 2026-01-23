"""
Download tokenizer files from HuggingFace model.
This script downloads vocab.json and merges.txt needed for proper text encoding.
"""

import argparse
from pathlib import Path
from huggingface_hub import hf_hub_download
import json

def main():
    parser = argparse.ArgumentParser(description="Download tokenizer files")
    parser.add_argument(
        "--model-id",
        type=str,
        default="runwayml/stable-diffusion-v1-5",
        help="HuggingFace model ID (default: runwayml/stable-diffusion-v1-5)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models",
        help="Directory to save tokenizer files (default: models)"
    )
    
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Downloading tokenizer files from {args.model_id}...")
    
    try:
        # Download vocab.json
        vocab_path = hf_hub_download(
            repo_id=args.model_id,
            filename="tokenizer/vocab.json",
            local_dir=str(output_dir),
            local_dir_use_symlinks=False
        )
        print(f"Downloaded vocab.json to {vocab_path}")
        
        # Download merges.txt
        merges_path = hf_hub_download(
            repo_id=args.model_id,
            filename="tokenizer/merges.txt",
            local_dir=str(output_dir),
            local_dir_use_symlinks=False
        )
        print(f"Downloaded merges.txt to {merges_path}")
        
        # Move files to output_dir if they're in subdirectories
        vocab_file = Path(vocab_path)
        merges_file = Path(merges_path)
        
        if vocab_file.parent != output_dir:
            import shutil
            shutil.move(str(vocab_file), str(output_dir / "vocab.json"))
            print(f"Moved vocab.json to {output_dir / 'vocab.json'}")
        
        if merges_file.parent != output_dir:
            import shutil
            shutil.move(str(merges_file), str(output_dir / "merges.txt"))
            print(f"Moved merges.txt to {output_dir / 'merges.txt'}")
        
        print("\nTokenizer files downloaded successfully!")
        
    except Exception as e:
        print(f"Error downloading tokenizer files: {e}")
        print("\nNote: The demo will work with a simplified tokenizer, but results may vary.")
        print("To download manually, visit:")
        print(f"  https://huggingface.co/{args.model_id}/tree/main/tokenizer")


if __name__ == "__main__":
    main()
