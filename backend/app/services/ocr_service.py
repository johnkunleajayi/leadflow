import os
import re
import shutil

import pytesseract
import requests
from PIL import Image, ImageOps


TESSERACT_PATH = os.getenv("TESSERACT_CMD")

if not TESSERACT_PATH:
    TESSERACT_PATH = shutil.which("tesseract")

if not TESSERACT_PATH:
    windows_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    if os.path.exists(windows_tesseract):
        TESSERACT_PATH = windows_tesseract

if TESSERACT_PATH:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


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

        r"[A-Z0-9.\_%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}",

        text or "",

        re.IGNORECASE,

    )



    return match.group(0).strip() if match else ""


def extract_urls(text: str) -> list[str]:

    """Extract website and LinkedIn URLs from OCR text."""



    matches = re.findall(

        r"(?:https?://|www\\.)[^\s]+",

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



    if re.match(r"^\\+?2340", value):

        value = re.sub(

            r"^\\+?2340",

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

        r"(?:\\+?234[\s().-]*)?(?:\d[\s().-]*){10,14}",

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

            r"nigeria|suite|st\\.|rd\\.|ave\\."

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

        r"(?:https?://|www\\.)",

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


def run_veryfi_business_card(
    image_bytes: bytes,
    filename: str,
    content_type: str,
) -> tuple[str, list[dict], float, dict]:
    """Read a business card with Veryfi and return LeadFlow-compatible data."""
    client_id = os.getenv("VERYFI_CLIENT_ID")
    bearer_token = os.getenv("VERYFI_BEARER_TOKEN")

    if not client_id or not bearer_token:
        raise RuntimeError("Veryfi credentials are not configured.")

    response = requests.post(
        "https://api.veryfi.com/api/v8/partner/business-cards",
        headers={
            "CLIENT-ID": client_id,
            "Authorization": f"Bearer {bearer_token}",
        },
        files={
            "file": (filename or "business-card.jpg", image_bytes, content_type)
        },
        timeout=30,
    )

    if response.status_code not in {200, 201}:
        raise RuntimeError(f"Veryfi OCR failed with status {response.status_code}.")

    payload = response.json()
    raw_text = normalize_ocr_text(payload.get("text") or "")
    first_name, last_name = parse_name(str(payload.get("person") or "").strip())
    website = str(payload.get("web") or "").strip()
    linkedin_url = website if "linkedin.com" in website.lower() else ""
    mobile = str(payload.get("mobile") or "").strip()
    phone = mobile or str(payload.get("phone") or "").strip()

    contact = {
        "first_name": first_name,
        "last_name": last_name,
        "company": str(payload.get("organization") or "").strip(),
        "email": str(payload.get("email") or "").strip(),
        "phone": phone,
        "title": str(payload.get("title") or "").strip(),
        "linkedin_url": linkedin_url,
        "website": "" if linkedin_url else website,
    }

    parsed = extract_business_card(raw_text)
    for key, value in parsed.items():
        if not contact.get(key) and value:
            contact[key] = value

    items = [
        {"text": line, "score": 1.0}
        for line in raw_text.splitlines()
        if line.strip()
    ]
    return raw_text, items, 100.0 if raw_text else 0.0, contact


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
