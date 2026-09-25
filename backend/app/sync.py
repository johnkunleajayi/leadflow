from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Lead
from app.oauth import (
    get_salesforce_token,
    update_salesforce_access_token,
)
from app.salesforce import (
    SalesforceAPIError,
    create_salesforce_lead,
    refresh_salesforce_access_token,
)


def _build_lead_data(
    lead: Lead,
) -> dict:
    return {
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


def _is_invalid_session_error(
    exc: SalesforceAPIError,
) -> bool:
    if exc.status_code != 401:
        return False

    response_data = exc.response_data

    if isinstance(response_data, list):
        for item in response_data:
            if isinstance(item, dict):
                if item.get("errorCode") == "INVALID_SESSION_ID":
                    return True

    if isinstance(response_data, dict):
        if response_data.get("errorCode") == "INVALID_SESSION_ID":
            return True

    return "INVALID_SESSION_ID" in str(exc)


def _refresh_salesforce_connection(
    db: Session,
    connection,
):
    if not connection.refresh_token:
        raise SalesforceAPIError(
            "Salesforce access token expired and no refresh token is available. "
            "Reconnect Salesforce to authorize automatic token refresh."
        )

    token_response = refresh_salesforce_access_token(
        refresh_token=connection.refresh_token,
    )

    new_access_token = token_response.get("access_token")

    if not new_access_token:
        raise SalesforceAPIError(
            "Salesforce token refresh succeeded but no access token was returned.",
            response_data=token_response,
        )

    new_instance_url = token_response.get(
        "instance_url",
        connection.instance_url,
    )

    new_token_type = token_response.get(
        "token_type",
        connection.token_type,
    )

    new_refresh_token = token_response.get(
        "refresh_token",
    )

    update_salesforce_access_token(
        db=db,
        connection=connection,
        access_token=new_access_token,
        instance_url=new_instance_url,
        token_type=new_token_type,
        refresh_token=new_refresh_token,
    )

    return connection


def sync_lead_to_salesforce(
    db: Session,
    lead: Lead,
) -> Lead:
    """
    Synchronize a local Lead with Salesforce.

    If Salesforce rejects the current access token with
    INVALID_SESSION_ID, automatically refresh the access token
    and retry the Lead creation once.
    """

    token = get_salesforce_token(db)

    if token is None:
        lead.sync_status = "Failed"
        lead.sync_error = "Salesforce is not connected."
        lead.synced_at = None

        db.commit()
        db.refresh(lead)

        return lead

    lead.sync_status = "Syncing"
    lead.sync_error = None

    db.commit()
    db.refresh(lead)

    lead_data = _build_lead_data(lead)

    try:
        salesforce_response = create_salesforce_lead(
            access_token=token.access_token,
            instance_url=token.instance_url,
            lead_data=lead_data,
        )

    except SalesforceAPIError as exc:

        if not _is_invalid_session_error(exc):
            lead.salesforce_lead_id = None
            lead.sync_status = "Failed"
            lead.sync_error = str(exc)
            lead.synced_at = None

            db.commit()
            db.refresh(lead)

            return lead

        try:
            token = _refresh_salesforce_connection(
                db=db,
                connection=token,
            )

            salesforce_response = create_salesforce_lead(
                access_token=token.access_token,
                instance_url=token.instance_url,
                lead_data=lead_data,
            )

        except SalesforceAPIError as refresh_exc:
            lead.salesforce_lead_id = None
            lead.sync_status = "Failed"
            lead.sync_error = (
                f"Automatic Salesforce token refresh failed: "
                f"{refresh_exc}"
            )
            lead.synced_at = None

            db.commit()
            db.refresh(lead)

            return lead

        except Exception as refresh_exc:
            lead.salesforce_lead_id = None
            lead.sync_status = "Failed"
            lead.sync_error = (
                f"Unexpected Salesforce token refresh error: "
                f"{refresh_exc}"
            )
            lead.synced_at = None

            db.commit()
            db.refresh(lead)

            return lead

    salesforce_lead_id = salesforce_response.get("id")

    if not salesforce_lead_id:
        lead.salesforce_lead_id = None
        lead.sync_status = "Failed"
        lead.sync_error = (
            "Salesforce created the Lead but did not return a Lead ID."
        )
        lead.synced_at = None

        db.commit()
        db.refresh(lead)

        return lead

    lead.salesforce_lead_id = salesforce_lead_id
    lead.sync_status = "Synced"
    lead.sync_error = None
    lead.synced_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(lead)

    return lead


def retry_lead_sync(
    db: Session,
    lead: Lead,
) -> Lead:
    """
    Retry Salesforce synchronization for a Lead.
    """

    lead.sync_status = "Pending"
    lead.sync_error = None

    db.commit()
    db.refresh(lead)

    return sync_lead_to_salesforce(
        db=db,
        lead=lead,
    )