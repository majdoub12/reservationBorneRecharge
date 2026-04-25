from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
from .pipeline import process_document_image
from .config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vehicle Document OCR API",
    description="Extract immatriculation and chassis number from vehicle registration images",
    version="1.0.0"
)

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {"status": "ok", "service": "ocr-api"}

@app.post(
    "/ocr/vehicle-document",
    tags=["OCR"],
    response_class=JSONResponse,
    responses={
        200: {"description": "Successful OCR extraction"},
        400: {"description": "Invalid image or processing error"},
        500: {"description": "Internal server error"}
    }
)
async def ocr_vehicle_document(
    file: UploadFile = File(..., description="Image file (JPG/PNG) of vehicle registration document")
):
    """
    Upload a vehicle document image and extract:
    - Immatriculation (license plate) with Tunisian format
    - Chassis number (VIN)
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/jpg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG and PNG images are supported"
        )
    
    try:
        # Read image bytes
        image_bytes = await file.read()
        if len(image_bytes) > 20 * 1024 * 1024:  # 20MB limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image too large (max 20MB)"
            )
        
        # Run pipeline
        result = process_document_image(image_bytes)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": result
            }
        )
        
    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing error: {str(e)}"
        )

# Optional: Swagger docs at /docs, ReDoc at /redoc
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True  # Auto-reload during development
    )