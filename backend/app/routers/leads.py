from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Lead
from app.schemas import LeadCreate, LeadResponse
from app.sync import sync_lead_to_salesforce


router = APIRouter(
    prefix="/api/v1/leads",
    tags=["Leads"],
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
        "created_at": lead.created_at,
    }


@router.post(
    "",
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


@router.get(
    "",
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