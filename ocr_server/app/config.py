# app/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    # ─── Roboflow Configuration ──────────────────────────────
    ROBOFLOW_API_URL: str = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY")
    ROBOFLOW_MODEL_ID: str = os.getenv("ROBOFLOW_MODEL_ID", "carte_grise_detection/3")
    
    # ─── PaddleOCR Configuration ─────────────────────────────
    OCR_USE_GPU: bool = os.getenv("OCR_USE_GPU", "false").lower() == "true"
    OCR_LANG: str = os.getenv("OCR_LANG", "en")
    
    # ─── Server Configuration ────────────────────────────────
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # ─── File/Temp Configuration ─────────────────────────────
    TEMP_DIR: Path = BASE_DIR / "temp"
    
    # ─── Helper Properties ───────────────────────────────────
    @property
    def paddle_device(self) -> str:
        """Return device string for PaddleOCR 3.x"""
        return "gpu" if self.OCR_USE_GPU else "cpu"
    
    def ensure_temp_dir(self):
        """Create temp directory if it doesn't exist"""
        self.TEMP_DIR.mkdir(parents=True, exist_ok=True)
        return self.TEMP_DIR

# Instantiate settings globally
settings = Settings()

# Ensure temp directory exists on import
settings.ensure_temp_dir()