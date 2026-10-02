import hashlib
import io
import re
import os
import shutil
from base64 import urlsafe_b64encode

import pytesseract
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.models import Base, Lead
from app.oauth import (
    create_oauth_session,
    generate_state,
    get_oauth_session,
    get_salesforce_token,
    remove_oauth_session,
    store_salesforce_token,
)
from app.salesforce import (
    exchange_authorization_code,
    generate_authorization_url,
    generate_pkce_verifier,
)
from app.schemas import LeadCreate, LeadResponse
from app.sync import sync_lead_to_salesforce


TESSERACT_PATH = os.getenv("TESSERACT_CMD")

if not TESSERACT_PATH:
    TESSERACT_PATH = shutil.which("tesseract")

if not TESSERACT_PATH:
    windows_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    if os.path.exists(windows_tesseract):
        TESSERACT_PATH = windows_tesseract

if TESSERACT_PATH:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="LeadFlow API",
    description="Platform-agnostic lead capture and contact context API",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://leadflow-six-theta.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def lead_to_response(lead: Lead) -> dict:
    """Convert a database Lead into an API response."""

    return {
        "id": str(lead.id),
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "company": lead.company,
        "email": lead.email,
        "phone": lead.phone,
        "title": lead.title,
        "linkedin_url": lead.linkedin_url,
        "event": lead.event,
        "capture_source": lead.capture_source,
        "notes": lead.notes,
        "lead_interest": lead.lead_interest,
        "follow_up_action": lead.follow_up_action,
        "status": lead.status,
        "rating": lead.rating,
        "salesforce_lead_id": lead.salesforce_lead_id,
        "sync_status": lead.sync_status,
        "sync_error": lead.sync_error,
        "synced_at": lead.synced_at,
    }


def normalize_ocr_text(text: str) -> str:
    """Normalize OCR output while preserving useful line structure."""

    lines = []

    for line in str(text or "").splitlines():
        line = re.sub(r"\s+", " ", line).strip()

        if line:
            lines.append(line)

    return "\n".join(lines)


def extract_email(text: str) -> str:
    """Extract the first email address from OCR text."""

    match = re.search(
        r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}",
        text or "",
        re.IGNORECASE,
    )

    return match.group(0).strip() if match else ""


def extract_urls(text: str) -> list[str]:
    """Extract website and LinkedIn URLs from OCR text."""

    matches = re.findall(
        r"(?:https?://|www\.)[^\s]+",
        text or "",
        re.IGNORECASE,
    )

    return [
        value.rstrip("),.;")
        for value in matches
    ]


def normalize_phone(value: str) -> str:
    """Normalize a phone number while preserving the international prefix."""

    value = re.sub(
        r"[^\d+]",
        "",
        str(value or ""),
    )

    if re.match(r"^\+?2340", value):
        value = re.sub(
            r"^\+?2340",
            "+234",
            value,
        )

    if value.startswith("234"):
        value = "+" + value

    return value


def extract_phones(text: str) -> list[str]:
    """Extract plausible phone numbers from contact-labeled OCR lines."""

    phones = []
    lines = str(text or "").splitlines()

    for line in lines:
        if not re.search(
            r"\b(?:mobile|mob|tel|telephone|phone|whatsapp|cell)\b",
            line,
            re.IGNORECASE,
        ):
            continue

        number_part = re.split(
            r"\b(?:mobile|mob|tel|telephone|phone|whatsapp|cell)\b",
            line,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[-1]

        number_part = re.split(
            r"\b(?:ext|extension)\b",
            number_part,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0]

        normalized = normalize_phone(number_part)

        digits = re.sub(
            r"\D",
            "",
            normalized,
        )

        if 10 <= len(digits) <= 15:
            phones.append(normalized)

    if phones:
        return list(dict.fromkeys(phones))

    for value in re.findall(
        r"(?:\+?234[\s().-]*)?(?:\d[\s().-]*){10,14}",
        text or "",
    ):
        normalized = normalize_phone(value)

        digits = re.sub(
            r"\D",
            "",
            normalized,
        )

        if 10 <= len(digits) <= 15:
            phones.append(normalized)

    return list(dict.fromkeys(phones))


def looks_like_company(line: str) -> bool:
    return bool(
        re.search(
            r"\b(?:"
            r"plc|ltd|limited|llc|inc|incorporated|bank|group|company|"
            r"corporation|corp|technologies|technology|consulting|"
            r"solutions|holdings|insurance|university|college|"
            r"microfinance|finance"
            r")\b",
            line,
            re.IGNORECASE,
        )
    )


def looks_like_title(line: str) -> bool:
    return bool(
        re.search(
            r"\b(?:"
            r"manager|director|officer|executive|engineer|developer|"
            r"administrator|consultant|specialist|analyst|associate|"
            r"advisor|adviser|founder|coordinator|supervisor|lead|"
            r"president|chairman|chief|partner|accountant|architect|"
            r"designer|sales|marketing|relationship|managing|general|"
            r"head"
            r")\b",
            line,
            re.IGNORECASE,
        )
    )


def looks_like_address(line: str) -> bool:
    return bool(
        re.search(
            r"\b(?:"
            r"street|road|avenue|close|drive|floor|plaza|lagos|abuja|"
            r"nigeria|suite|st\.|rd\.|ave\."
            r")\b",
            line,
            re.IGNORECASE,
        )
    )


def looks_like_name(line: str) -> bool:
    """Identify a plausible person's name from an OCR line."""

    line = line.strip()

    if not line:
        return False

    if "@" in line:
        return False

    if re.search(
        r"(?:https?://|www\.)",
        line,
        re.IGNORECASE,
    ):
        return False

    if len(re.sub(r"\D", "", line)) >= 10:
        return False

    if looks_like_address(line):
        return False

    if looks_like_company(line):
        return False

    if looks_like_title(line):
        return False

    if re.search(r"\d", line):
        return False

    words = [
        word
        for word in line.split()
        if word
    ]

    if len(words) < 2 or len(words) > 5:
        return False

    letters = re.sub(
        r"[^A-Za-z]",
        "",
        line,
    )

    return len(letters) >= 5


def parse_name(name: str) -> tuple[str, str]:
    """Split a plausible full name into first and last name."""

    cleaned = re.sub(
        r"[^A-Za-zÀ-ÖØ-öø-ÿ' -]",
        " ",
        name,
    )

    parts = [
        part
        for part in cleaned.split()
        if part
    ]

    if not parts:
        return "", ""

    return (
        parts[0],
        " ".join(parts[1:]),
    )


def extract_business_card(text: str) -> dict:
    """Extract structured contact information from OCR text."""

    normalized_text = normalize_ocr_text(text)

    lines = [
        line
        for line in normalized_text.splitlines()
        if line
    ]

    email = extract_email(normalized_text)
    urls = extract_urls(normalized_text)
    phones = extract_phones(normalized_text)

    title_line = next(
        (
            line
            for line in lines
            if looks_like_title(line)
        ),
        "",
    )

    company_line = next(
        (
            line
            for line in lines
            if looks_like_company(line)
            and line != title_line
        ),
        "",
    )

    name_line = next(
        (
            line
            for line in lines
            if looks_like_name(line)
            and line != title_line
            and line != company_line
        ),
        "",
    )

    first_name, last_name = parse_name(
        name_line
    )

    linkedin_url = next(
        (
            url
            for url in urls
            if "linkedin.com" in url.lower()
        ),
        "",
    )

    website = next(
        (
            url
            for url in urls
            if "linkedin.com" not in url.lower()
        ),
        "",
    )

    return {
        "first_name": first_name,
        "last_name": last_name,
        "company": company_line,
        "email": email,
        "phone": phones[0] if phones else "",
        "title": title_line,
        "linkedin_url": linkedin_url,
        "website": website,
    }



def prepare_ocr_variants(
    image: Image.Image,
) -> list[tuple[str, Image.Image]]:
    """
    Create two OCR-safe variants for low-resource hosting.
    """

    image = ImageOps.exif_transpose(image)

    if image.mode != "RGB":
        image = image.convert("RGB")

    grayscale = ImageOps.grayscale(image)

    return [
        (
            "original",
            image,
        ),
        (
            "autocontrast",
            ImageOps.autocontrast(grayscale),
        ),
    ]


def run_tesseract(
    image: Image.Image,
    psm: int = 3,
) -> tuple[str, list[dict], float]:
    """
    Run one Tesseract process with a hard timeout.
    """

    config = f"--oem 3 --psm {psm}"

    try:
        data = pytesseract.image_to_data(
            image,
            config=config,
            output_type=pytesseract.Output.DICT,
            timeout=15,
        )

    except RuntimeError as exc:
        raise RuntimeError(
            "Tesseract OCR timed out while reading the business card."
        ) from exc

    groups: dict[tuple, dict] = {}

    all_confidences = []

    text_values = data.get(
        "text",
        [],
    )

    confidence_values = data.get(
        "conf",
        [],
    )

    block_values = data.get(
        "block_num",
        [0] * len(text_values),
    )

    paragraph_values = data.get(
        "par_num",
        [0] * len(text_values),
    )

    line_values = data.get(
        "line_num",
        [0] * len(text_values),
    )

    for index, value in enumerate(
        text_values
    ):
        word = str(
            value or ""
        ).strip()

        if not word:
            continue

        try:
            confidence = max(
                0.0,
                float(
                    confidence_values[index]
                ),
            )

        except (
            ValueError,
            TypeError,
            IndexError,
        ):
            confidence = 0.0

        all_confidences.append(
            confidence
        )

        key = (
            block_values[index],
            paragraph_values[index],
            line_values[index],
        )

        if key not in groups:
            groups[key] = {
                "texts": [],
                "confidences": [],
            }

        groups[key]["texts"].append(
            word
        )

        groups[key]["confidences"].append(
            confidence
        )

    items = []

    raw_lines = []

    for group in groups.values():
        line_text = " ".join(
            group["texts"]
        ).strip()

        confidences = group[
            "confidences"
        ]

        if not line_text:
            continue

        raw_lines.append(
            line_text
        )

        score = (
            sum(confidences)
            / len(confidences)
            if confidences
            else 0.0
        )

        items.append(
            {
                "text": line_text,
                "score": round(
                    score / 100,
                    4,
                ),
            }
        )

    average_confidence = (
        sum(all_confidences)
        / len(all_confidences)
        if all_confidences
        else 0.0
    )

    raw_text = "\n".join(
        raw_lines
    )

    return (
        normalize_ocr_text(
            raw_text
        ),
        items,
        average_confidence,
    )


def score_ocr_candidate(
    text: str,
    average_confidence: float,
) -> tuple[float, dict]:
    """
    Score OCR using both recognition confidence
    and useful contact fields.
    """

    contact = extract_business_card(
        text
    )

    score = average_confidence

    if contact["email"]:
        score += 30

    if contact["phone"]:
        score += 25

    if contact["company"]:
        score += 20

    if contact["title"]:
        score += 15

    if (
        contact["first_name"]
        and contact["last_name"]
    ):
        score += 20

    if contact["website"]:
        score += 8

    if contact["linkedin_url"]:
        score += 8

    return (
        score,
        contact,
    )


def run_best_orientation_ocr(
    image: Image.Image,
) -> tuple[str, list[dict], float, int]:
    """
    Run lightweight OCR for the landscape
    business-card capture.

    Only normal orientation is evaluated.
    Original and autocontrast variants are
    compared.
    """

    candidates = []

    for (
        variant_name,
        prepared,
    ) in prepare_ocr_variants(
        image
    ):
        (
            raw_text,
            items,
            confidence,
        ) = run_tesseract(
            prepared,
            psm=3,
        )

        (
            score,
            contact,
        ) = score_ocr_candidate(
            raw_text,
            confidence,
        )

        candidates.append(
            {
                "angle": 0,
                "variant": variant_name,
                "text": raw_text,
                "items": items,
                "confidence": confidence,
                "score": score,
                "contact": contact,
            }
        )

    if not candidates:
        return (
            "",
            [],
            0.0,
            0,
        )

    best = max(
        candidates,
        key=lambda candidate: candidate[
            "score"
        ],
    )

    return (
        best["text"],
        best["items"],
        best["confidence"],
        best["angle"],
    )




@app.get("/")
def root():
    return {
        "message": "LeadFlow API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/api/v1/ocr/status")
def ocr_status():
    """Return the OCR engine availability."""

    try:
        version = (
            pytesseract.get_tesseract_version()
        )

        return {
            "available": True,
            "engine": "Tesseract OCR",
            "version": str(
                version
            ).strip(),
            "error": None,
        }

    except Exception as exc:
        return {
            "available": False,
            "engine": "Tesseract OCR",
            "version": None,
            "error": str(exc),
        }


@app.post(
    "/api/v1/ocr/business-card"
)
async def scan_business_card(
    file: UploadFile = File(...),
):
    """Read a business-card image using Tesseract OCR."""

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file has no "
                "content type."
            ),
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/bmp",
        "image/tiff",
    }

    if (
        file.content_type
        not in allowed_types
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image type. "
                "Please upload a JPEG, PNG, "
                "WebP, BMP, or TIFF image."
            ),
        )

    try:
        image_bytes = await file.read()

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The uploaded image is empty."
                ),
            )

        if (
            len(image_bytes)
            > 10 * 1024 * 1024
        ):
            raise HTTPException(
                status_code=413,
                detail=(
                    "The business-card image "
                    "must be smaller than 10 MB."
                ),
            )

        try:
            image = Image.open(
                io.BytesIO(
                    image_bytes
                )
            )

            image.load()

        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The uploaded file is "
                    "not a valid image."
                ),
            ) from exc

        if not image.width or not image.height:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The uploaded image has "
                    "invalid dimensions."
                ),
            )

        (
            raw_text,
            items,
            average_confidence,
            rotation,
        ) = run_best_orientation_ocr(
            image
        )

        if not items and not raw_text:
            raise HTTPException(
                status_code=422,
                detail=(
                    "LeadFlow could not detect "
                    "readable text on this "
                    "business card."
                ),
            )

        contact = extract_business_card(
            raw_text
        )

        ocr_score = average_confidence

        if contact["email"]:
            ocr_score += 8

        if contact["phone"]:
            ocr_score += 8

        if contact["company"]:
            ocr_score += 6

        if contact["title"]:
            ocr_score += 5

        if (
            contact["first_name"]
            and contact["last_name"]
        ):
            ocr_score += 5

        if contact["website"]:
            ocr_score += 4

        if contact["linkedin_url"]:
            ocr_score += 4

        ocr_score = min(
            100.0,
            ocr_score,
        )

        return {
            "type": "business-card",
            "contact": contact,
            "rawText": raw_text,
            "ocrItems": items,
            "ocrScore": round(
                ocr_score,
                2,
            ),
            "rotation": rotation,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "LeadFlow could not process "
                "the business-card image."
            ),
        ) from exc

    finally:
        await file.close()


@app.post(
    "/api/v1/leads",
    response_model=LeadResponse,
)
def create_lead(
    lead: LeadCreate,
    db: Session = Depends(get_db),
):
    db_lead = Lead(
        first_name=lead.first_name,
        last_name=lead.last_name,
        company=lead.company,
        email=lead.email,
        phone=lead.phone,
        title=lead.title,
        linkedin_url=lead.linkedin_url,
        event=lead.event,
        capture_source=lead.capture_source,
        notes=lead.notes,
        lead_interest=lead.lead_interest,
        follow_up_action=lead.follow_up_action,
        status=lead.status or "New",
        rating=lead.rating,
        sync_status="Pending",
    )

    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)

    sync_lead_to_salesforce(
        db=db,
        lead=db_lead,
    )

    return lead_to_response(
        db_lead
    )


@app.get(
    "/api/v1/leads",
    response_model=list[LeadResponse],
)
def get_leads(
    db: Session = Depends(get_db),
):
    leads = (
        db.query(Lead)
        .order_by(
            Lead.created_at.desc()
        )
        .all()
    )

    return [
        lead_to_response(lead)
        for lead in leads
    ]


@app.get(
    "/api/v1/salesforce/status"
)
def salesforce_status(
    db: Session = Depends(get_db),
):
    """
    Return the current Salesforce
    connection status.

    The endpoint exposes connection
    metadata and token availability
    without exposing the actual OAuth
    tokens.
    """

    connection = get_salesforce_token(
        db
    )

    if connection is None:
        return {
            "connected": False,
            "instance_url": None,
            "token_available": False,
            "refresh_token_available": False,
            "status": "Disconnected",
        }

    return {
        "connected": True,
        "instance_url": (
            connection.instance_url
        ),
        "token_available": bool(
            connection.access_token
        ),
        "refresh_token_available": bool(
            connection.refresh_token
        ),
        "status": "Connected",
    }


@app.get(
    "/api/v1/salesforce/login"
)
def salesforce_login():
    state = generate_state()

    code_verifier = (
        generate_pkce_verifier()
    )

    code_challenge = (
        urlsafe_b64encode(
            hashlib.sha256(
                code_verifier.encode(
                    "utf-8"
                )
            ).digest()
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    create_oauth_session(
        state=state,
        code_verifier=code_verifier,
    )

    authorization_url = (
        generate_authorization_url(
            code_challenge=code_challenge,
            state=state,
        )
    )

    return RedirectResponse(
        url=authorization_url
    )


@app.get(
    "/api/v1/salesforce/callback"
)
def salesforce_callback(
    code: str | None = Query(
        default=None
    ),
    state: str | None = Query(
        default=None
    ),
    error: str | None = Query(
        default=None
    ),
    error_description: str | None = Query(
        default=None
    ),
    db: Session = Depends(get_db),
):
    if error:
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Salesforce authorization "
                    "failed."
                ),
                "error": error,
                "description": (
                    error_description
                ),
            },
        )

    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing Salesforce "
                "authorization code or state."
            ),
        )

    oauth_session = (
        get_oauth_session(state)
    )

    if oauth_session is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid or expired "
                "Salesforce OAuth session."
            ),
        )

    try:
        token_response = (
            exchange_authorization_code(
                code=code,
                code_verifier=(
                    oauth_session.code_verifier
                ),
            )
        )

        access_token = (
            token_response.get(
                "access_token"
            )
        )

        refresh_token = (
            token_response.get(
                "refresh_token"
            )
        )

        instance_url = (
            token_response.get(
                "instance_url"
            )
        )

        token_type = (
            token_response.get(
                "token_type",
                "Bearer",
            )
        )

        if (
            not access_token
            or not instance_url
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Salesforce did not return "
                    "the required access token."
                ),
            )

        store_salesforce_token(
            db=db,
            access_token=access_token,
            refresh_token=refresh_token,
            instance_url=instance_url,
            token_type=token_type,
        )

    finally:
        remove_oauth_session(state)

    return {
        "message": (
            "Salesforce authorization "
            "successful."
        ),
        "instance_url": instance_url,
        "token_type": token_type,
        "refresh_token_available": bool(
            refresh_token
        ),
    }

