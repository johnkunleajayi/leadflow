from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models import Base, Lead
from app.schemas import LeadCreate, LeadResponse


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="LeadFlow API",
    description="Platform-agnostic lead capture and contact context API",
    version="0.1.0",
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


@app.post("/api/v1/leads", response_model=LeadResponse)
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
        status=lead.status,
        rating=lead.rating,
    )

    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)

    return {
        "id": str(db_lead.id),
        "first_name": db_lead.first_name,
        "last_name": db_lead.last_name,
        "company": db_lead.company,
        "email": db_lead.email,
        "phone": db_lead.phone,
        "title": db_lead.title,
        "linkedin_url": db_lead.linkedin_url,
        "event": db_lead.event,
        "capture_source": db_lead.capture_source,
        "notes": db_lead.notes,
        "lead_interest": db_lead.lead_interest,
        "follow_up_action": db_lead.follow_up_action,
        "status": db_lead.status,
        "rating": db_lead.rating,
    }


@app.get("/api/v1/leads", response_model=list[LeadResponse])
def get_leads(db: Session = Depends(get_db)):
    leads = db.query(Lead).order_by(Lead.created_at.desc()).all()

    return [
        {
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
        }
        for lead in leads
    ]