from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class LeadCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    company: Optional[str] = Field(default=None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=40)
    title: Optional[str] = Field(default=None, max_length=128)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)

    event: Optional[str] = Field(default=None, max_length=255)
    capture_source: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=5000)
    lead_interest: Optional[str] = Field(default=None, max_length=1000)
    follow_up_action: Optional[str] = Field(default=None, max_length=1000)

    status: Optional[str] = Field(default="New", max_length=50)
    rating: Optional[str] = Field(default=None, max_length=50)


class LeadResponse(LeadCreate):
    id: str