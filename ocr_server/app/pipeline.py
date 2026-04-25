import cv2
import json
from pathlib import Path
from paddleocr import PaddleOCR
from inference_sdk import InferenceHTTPClient
from .config import settings
from .utils import preprocess_for_mobile, crop_region, cv2_to_pil
from .config import settings

import logging

logger = logging.getLogger(__name__)

# Initialize models ONCE at module load (singleton pattern)
roboflow_client = InferenceHTTPClient(
    api_url=settings.ROBOFLOW_API_URL,
    api_key=settings.ROBOFLOW_API_KEY
)

# ✅ PaddleOCR 3.x: Use 'device' instead of 'use_gpu', and remove 'lang' when specifying model names
ocr_engine = PaddleOCR(
    # lang="ar",
    det_db_thresh=0.2,det_db_box_thresh=0.3,
    det_db_unclip_ratio=1.0,
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    ocr_version="PP-OCRv5",
    # text_detection_model_name="PP-OCRv5_det",
    # text_recognition_model_name="PP-OCRv5_rec",
    device="cpu" if not settings.OCR_USE_GPU else "gpu",  # ✅ Correct parameter for v3.x
    # ❌ Removed: lang=settings.OCR_LANG (ignored when model names are specified)
    # ❌ Removed: use_gpu=... (deprecated in v3.x)
)

# app/pipeline.py - Updated process_document_image function

def process_document_image(image_bytes: bytes) -> dict:
    """
    Main pipeline: detect regions → crop → OCR → format results
    Returns structured JSON with immatriculation and chassis data
    """
    import numpy as np
    from PIL import Image
    import io
    
    try:
        # 🔧 Convert bytes → PIL Image for Roboflow SDK compatibility
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Step 1: Run Roboflow detection (accepts PIL Image)
        result = roboflow_client.infer(pil_image, model_id=settings.ROBOFLOW_MODEL_ID)
        
        # Step 2: Preprocess original image for cropping (OpenCV format)
        # Convert bytes → OpenCV for preprocessing pipeline
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_cv is None:
            raise ValueError("Failed to decode image with OpenCV")
        
        # Apply preprocessing (CLAHE enhancement)
        # img_cv = preprocess_for_mobile_bytes(image_bytes)  # See helper below
        
        crops = {}
        
        for pred in result.get("predictions", []):
            cls = int(pred.get("class", -1))
            crop = crop_region(img_cv, pred)
            
            if cls == 11:  # immatriculation
                crop = cv2.rotate(crop, cv2.ROTATE_90_CLOCKWISE)
                crops["immatriculation"] = crop
            elif cls == 8:  # numéro de châssis
                crops["num_chassis"] = crop
        
        # Step 3: Run OCR on cropped regions
        ocr_results = {}
        for name, crop in crops.items():
            # ✅ settings.TEMP_DIR is now a Path object
            temp_path = settings.TEMP_DIR / f"{name}.jpg"
            cv2.imwrite(str(temp_path), crop)  # cv2.imwrite needs string path

            results = ocr_engine.predict(str(temp_path))
            for res in results:
                res.save_to_json(str(settings.TEMP_DIR / f"{name}_ocr.json"))
                ocr_results[name] = res
            # print(f"OCR results for {name}: {results}")
            # ocr_results[name] = results[0] if results else None
        # Step 4: Parse and structure output
        return format_ocr_output(ocr_results)
        
    except Exception as e:
        logger.error(f"Pipeline error: {str(e)}", exc_info=True)
        raise
def format_ocr_output(ocr_results: dict) -> dict:
    """Extract and format final text results from OCR outputs"""
    output = {
        "immatriculation": None,
        "chassis": None,
        "raw_ocr": {}
    }
    
    # --- Immatriculation parsing ---
    # Load saved JSON files
    immatriculation_path = Path(settings.TEMP_DIR) / 'immatriculation_ocr.json'
    chassis_path = Path(settings.TEMP_DIR) / 'num_chassis_ocr.json'

    # Read JSON data
    if immatriculation_path.exists():
        with immatriculation_path.open('r') as f:
            immatriculation_data = json.load(f)
            texts = immatriculation_data.get('rec_texts', [None])
            boxes = immatriculation_data.get('rec_boxes', [None])

            numeric_entries = []
            for t, b in zip(texts, boxes):
                if t and t.isdigit():
                    x_coord = b[0] if isinstance(b, (list, tuple)) and len(b) > 0 else 0
                    numeric_entries.append((x_coord, t))

            numeric_entries.sort(key=lambda x: x[0])

            if len(numeric_entries) >= 2:
                left_num, right_num = numeric_entries[0][1], numeric_entries[1][1]
                output['immatriculation'] = f'{left_num}Tun{right_num}'

    if chassis_path.exists():
        with chassis_path.open('r') as f:
            chassis_data = json.load(f)
            output['chassis'] = chassis_data.get('rec_texts', [None])[0]
            output['raw_ocr']['chassis'] = chassis_data
    
    # Optional: include raw OCR data for debugging
    for name, res in ocr_results.items():
        if res:
            output["raw_ocr"][name] = {
                "texts": getattr(res, "rec_texts", []) or [],
                "scores": getattr(res, "rec_scores", []) or []
            }
    
    return output