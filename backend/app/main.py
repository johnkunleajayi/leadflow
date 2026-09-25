import hashlib
from base64 import urlsafe_b64encode

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
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

    return lead_to_response(db_lead)


@app.get(
    "/api/v1/leads",
    response_model=list[LeadResponse],
)
def get_leads(
    db: Session = Depends(get_db),
):
    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .all()
    )

    return [
        lead_to_response(lead)
        for lead in leads
    ]


@app.get("/api/v1/salesforce/status")
def salesforce_status(
    db: Session = Depends(get_db),
):
    """
    Return the current Salesforce connection status.

    The endpoint exposes connection metadata and token availability
    without exposing the actual OAuth tokens.
    """

    connection = get_salesforce_token(db)

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
        "instance_url": connection.instance_url,
        "token_available": bool(connection.access_token),
        "refresh_token_available": bool(connection.refresh_token),
        "status": "Connected",
    }


@app.get("/api/v1/salesforce/login")
def salesforce_login():
    state = generate_state()

    code_verifier = generate_pkce_verifier()

    code_challenge = urlsafe_b64encode(
        hashlib.sha256(
            code_verifier.encode("utf-8")
        ).digest()
    ).rstrip(b"=").decode("utf-8")

    create_oauth_session(
        state=state,
        code_verifier=code_verifier,
    )

    authorization_url = generate_authorization_url(
        code_challenge=code_challenge,
        state=state,
    )

    return RedirectResponse(
        url=authorization_url
    )


@app.get("/api/v1/salesforce/callback")
def salesforce_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if error:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Salesforce authorization failed.",
                "error": error,
                "description": error_description,
            },
        )

    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="Missing Salesforce authorization code or state.",
        )

    oauth_session = get_oauth_session(state)

    if oauth_session is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired Salesforce OAuth session.",
        )

    try:
        token_response = exchange_authorization_code(
            code=code,
            code_verifier=oauth_session.code_verifier,
        )

        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")
        instance_url = token_response.get("instance_url")
        token_type = token_response.get(
            "token_type",
            "Bearer",
        )

        if not access_token or not instance_url:
            raise HTTPException(
                status_code=400,
                detail="Salesforce did not return the required access token.",
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
        "message": "Salesforce authorization successful.",
        "instance_url": instance_url,
        "token_type": token_type,
        "refresh_token_available": bool(refresh_token),
    }