import io

import pytesseract
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from app.services.ocr_service import (
    extract_business_card,
    run_best_orientation_ocr,
    run_veryfi_business_card,
)


router = APIRouter(
    prefix="/api/v1/ocr",
    tags=["OCR"],
)


@router.get("/status")
def ocr_status():
    """Return the OCR engine availability."""

    try:
        version = pytesseract.get_tesseract_version()

        return {
            "available": True,
            "engine": "Tesseract",
            "version": str(version),
        }

    except Exception as exc:
        return {
            "available": False,
            "engine": "Tesseract",
            "error": str(exc),
        }


@router.post("/business-card")
async def scan_business_card(
    file: UploadFile = File(...),
):
    """Read a business card image and extract lead fields."""

    if not file.content_type or not file.content_type.startswith(
        "image/"
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file.",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    try:
        try:
            (
                raw_text,
                items,
                average_confidence,
                contact,
            ) = run_veryfi_business_card(
                image_bytes=image_bytes,
                filename=file.filename or "business-card.jpg",
                content_type=file.content_type,
            )

            return {
                "success": True,
                "engine": "Veryfi",
                "raw_text": raw_text,
                "items": items,
                "average_confidence": round(
                    average_confidence,
                    2,
                ),
                "rotation": 0,
                "contact": contact,
            }

        except Exception:
            image = Image.open(
                io.BytesIO(image_bytes)
            )

            (
                raw_text,
                items,
                average_confidence,
                rotation,
            ) = run_best_orientation_ocr(image)

            contact = extract_business_card(
                raw_text
            )

            return {
                "success": True,
                "engine": "Tesseract",
                "raw_text": raw_text,
                "items": items,
                "average_confidence": round(
                    average_confidence,
                    2,
                ),
                "rotation": rotation,
                "contact": contact,
            }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OCR failed: {exc}",
        ) from exc