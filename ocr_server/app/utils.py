import cv2
import numpy as np
from PIL import Image
import io

def preprocess_for_mobile(img_bytes: bytes) -> np.ndarray:
    """Enhance image for OCR: grayscale + CLAHE"""
    # Convert bytes to OpenCV image
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # CLAHE for better contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Convert back to 3-channel for compatibility
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

def crop_region(img: np.ndarray, pred: dict) -> np.ndarray:
    """Crop image region based on Roboflow prediction dict"""
    x, y, w, h = pred["x"], pred["y"], pred["width"], pred["height"]
    x1, y1 = int(x - w/2), int(y - h/2)
    x2, y2 = int(x + w/2), int(y + h/2)
    return img[y1:y2, x1:x2]

def cv2_to_pil(cv2_img: np.ndarray) -> Image.Image:
    """Convert OpenCV BGR image to PIL RGB"""
    rgb = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)

def pil_to_bytes(pil_img: Image.Image, format: str = "JPEG") -> bytes:
    """Convert PIL image to bytes for return"""
    buf = io.BytesIO()
    pil_img.save(buf, format=format)
    return buf.getvalue()