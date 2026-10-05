import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import (
    SalesforceConnection,
    SalesforceOAuthSession,
)


def create_oauth_session(
    db: Session,
    state: str,
    code_verifier: str,
) -> SalesforceOAuthSession:
    oauth_session = SalesforceOAuthSession(
        state=state,
        code_verifier=code_verifier,
    )

    db.add(oauth_session)
    db.commit()
    db.refresh(oauth_session)

    return oauth_session


def get_oauth_session(
    db: Session,
    state: str,
) -> SalesforceOAuthSession | None:
    return (
        db.query(SalesforceOAuthSession)
        .filter(SalesforceOAuthSession.state == state)
        .first()
    )


def remove_oauth_session(
    db: Session,
    state: str,
) -> None:
    oauth_session = get_oauth_session(
        db=db,
        state=state,
    )

    if oauth_session is not None:
        db.delete(oauth_session)
        db.commit()


def generate_state() -> str:
    return secrets.token_urlsafe(32)


def store_salesforce_token(
    db: Session,
    access_token: str,
    instance_url: str,
    token_type: str,
    refresh_token: str | None = None,
) -> SalesforceConnection:
    connection = (
        db.query(SalesforceConnection)
        .order_by(SalesforceConnection.id.desc())
        .first()
    )

    now = datetime.now(timezone.utc)

    if connection is None:
        connection = SalesforceConnection(
            access_token=access_token,
            refresh_token=refresh_token,
            instance_url=instance_url,
            token_type=token_type,
            created_at=now,
            updated_at=now,
        )

        db.add(connection)

    else:
        connection.access_token = access_token
        connection.instance_url = instance_url
        connection.token_type = token_type

        if refresh_token is not None:
            connection.refresh_token = refresh_token

        connection.updated_at = now

    db.commit()
    db.refresh(connection)

    return connection


def get_salesforce_token(
    db: Session,
) -> SalesforceConnection | None:
    return (
        db.query(SalesforceConnection)
        .order_by(SalesforceConnection.id.desc())
        .first()
    )


def update_salesforce_access_token(
    db: Session,
    connection: SalesforceConnection,
    access_token: str,
    instance_url: str | None = None,
    token_type: str | None = None,
    refresh_token: str | None = None,
) -> SalesforceConnection:
    connection.access_token = access_token

    if instance_url:
        connection.instance_url = instance_url

    if token_type:
        connection.token_type = token_type

    if refresh_token is not None:
        connection.refresh_token = refresh_token

    connection.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(connection)

    return connection


def clear_salesforce_token(
    db: Session,
) -> None:
    connections = db.query(SalesforceConnection).all()

    for connection in connections:
        db.delete(connection)

    db.commit()