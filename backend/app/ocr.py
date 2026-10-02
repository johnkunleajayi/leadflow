import io
import re
from typing import Any

import cv2
import numpy as np
import pytesseract
from PIL import Image


TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


def get_tesseract_version() -> str | None:
    try:
        version = pytesseract.get_tesseract_version()
        return str(version).strip()
    except Exception:
        return None


def is_tesseract_available() -> bool:
    return get_tesseract_version() is not None


def get_ocr_status() -> dict[str, Any]:
    version = get_tesseract_version()

    if version:
        return {
            "available": True,
            "engine": "Tesseract OCR",
            "version": version,
            "error": None,
        }

    return {
        "available": False,
        "engine": "Tesseract OCR",
        "version": None,
        "error": (
            "Tesseract OCR is not available. "
            f"Expected executable at: {TESSERACT_PATH}"
        ),
    }


def preprocess_image(image_bytes: bytes) -> Image.Image:
    image = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")

    image_array = np.array(image)

    gray = cv2.cvtColor(
        image_array,
        cv2.COLOR_RGB2GRAY,
    )

    gray = cv2.resize(
        gray,
        None,
        fx=1.5,
        fy=1.5,
        interpolation=cv2.INTER_CUBIC,
    )

    gray = cv2.fastNlMeansDenoising(
        gray,
        None,
        10,
        7,
        21,
    )

    processed = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )

    return Image.fromarray(processed)


def normalize_text(text: str) -> str:
    return re.sub(
        r"[ \t]+",
        " ",
        text.replace("\r", ""),
    ).strip()


def run_tesseract(
    image: Image.Image,
) -> dict[str, Any]:
    data = pytesseract.image_to_data(
        image,
        config="--oem 3 --psm 6",
        output_type=pytesseract.Output.DICT,
    )

    items = []

    count = len(
        data.get("text", [])
    )

    for index in range(count):
        text = normalize_text(
            data["text"][index]
        )

        if not text:
            continue

        try:
            confidence = float(
                data["conf"][index]
            )
        except (
            ValueError,
            TypeError,
        ):
            confidence = 0.0

        items.append(
            {
                "text": text,
                "score": max(
                    0.0,
                    min(
                        confidence / 100.0,
                        1.0,
                    ),
                ),
                "left": int(
                    data["left"][index]
                ),
                "top": int(
                    data["top"][index]
                ),
                "width": int(
                    data["width"][index]
                ),
                "height": int(
                    data["height"][index]
                ),
            }
        )

    raw_text = "\n".join(
        item["text"]
        for item in items
    )

    return {
        "text": raw_text,
        "items": items,
    }


def process_business_card(
    image_bytes: bytes,
) -> dict[str, Any]:
    if not is_tesseract_available():
        status = get_ocr_status()

        raise RuntimeError(
            status["error"]
        )

    original_image = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")

    processed_image = preprocess_image(
        image_bytes
    )

    original_result = run_tesseract(
        original_image
    )

    processed_result = run_tesseract(
        processed_image
    )

    original_text = original_result[
        "text"
    ]

    processed_text = processed_result[
        "text"
    ]

    if len(processed_text) > len(
        original_text
    ):
        selected_result = (
            processed_result
        )
    else:
        selected_result = (
            original_result
        )

    return {
        "text": selected_result["text"],
        "items": selected_result["items"],
        "original_text": original_text,
        "processed_text": processed_text,
    }