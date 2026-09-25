import secrets
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import SalesforceConnection


@dataclass
class OAuthSession:
    state: str
    code_verifier: str


_sessions: dict[str, OAuthSession] = {}


def create_oauth_session(
    state: str,
    code_verifier: str,
) -> None:
    _sessions[state] = OAuthSession(
        state=state,
        code_verifier=code_verifier,
    )


def get_oauth_session(
    state: str,
) -> OAuthSession | None:
    return _sessions.get(state)


def remove_oauth_session(
    state: str,
) -> None:
    _sessions.pop(state, None)


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