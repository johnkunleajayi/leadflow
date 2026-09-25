from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)

    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    title: Mapped[str | None] = mapped_column(String(128), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    event: Mapped[str | None] = mapped_column(String(255), nullable=True)
    capture_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    lead_interest: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    follow_up_action: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="New",
    )

    rating: Mapped[str | None] = mapped_column(String(50), nullable=True)

    salesforce_lead_id: Mapped[str | None] = mapped_column(
        String(18),
        nullable=True,
        unique=True,
        index=True,
    )

    sync_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Pending",
    )

    sync_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class SalesforceConnection(Base):
    __tablename__ = "salesforce_connections"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    access_token: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    refresh_token: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    instance_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    token_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Bearer",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )