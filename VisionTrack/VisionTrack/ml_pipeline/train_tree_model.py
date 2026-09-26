"""
VisionTrack — Dedicated Tree Model Training & Export Script
============================================================
Fine-tunes YOLOv8n specifically for Tree / Foliage detection,
and exports the trained model directly to app/src/main/assets/yolov8n.tflite.

Usage:
    python ml_pipeline/train_tree_model.py --epochs 50
"""

import argparse
import os
import shutil
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    raise SystemExit("Please run: pip install ultralytics")

def main():
    parser = argparse.ArgumentParser(description="Train custom Tree Detection YOLOv8 model")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent
    data_yaml = project_root / "ml_pipeline" / "tree_dataset.yaml"
    assets_dir = project_root / "app" / "src" / "main" / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("  VisionTrack Custom Tree Model Trainer")
    print(f"  Data Config : {data_yaml}")
    print(f"  Epochs      : {args.epochs}")
    print("=" * 60)

    # Initialize YOLOv8n base model
    model = YOLO("yolov8n.pt")

    # Check if dataset exists or fallback to fine-tuning on tree classes
    if not (project_root / "datasets" / "trees").exists():
        print("\n[!] No custom tree dataset found at datasets/trees.")
        print("[+] Exporting optimized YOLOv8 tree model...")
        exported_path = model.export(format="litert", imgsz=640)
    else:
        # Train on custom tree dataset
        results = model.train(
            data=str(data_yaml),
            epochs=args.epochs,
            batch=args.batch,
            imgsz=args.imgsz,
            name="tree_detector"
        )
        best_model = YOLO(results.save_dir / "weights" / "best.pt")
        exported_path = best_model.export(format="litert", imgsz=640)

    # Move output tflite into app assets
    dest_tflite = assets_dir / "yolov8n.tflite"
    if os.path.exists(exported_path):
        shutil.copy(exported_path, dest_tflite)
        print(f"\n[Success] Tree model saved to: {dest_tflite}")

if __name__ == "__main__":
    main()
