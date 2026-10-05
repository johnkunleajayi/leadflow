import hashlib
from base64 import urlsafe_b64encode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
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

router = APIRouter(
    prefix="/api/v1/salesforce",
    tags=["Salesforce"],
)


@router.get("/status")
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
        "token_available": bool(
            connection.access_token
        ),
        "refresh_token_available": bool(
            connection.refresh_token
        ),
        "status": "Connected",
    }


@router.get("/login")
def salesforce_login(
    db: Session = Depends(get_db),
):
    state = generate_state()

    code_verifier = generate_pkce_verifier()

    code_challenge = (
        urlsafe_b64encode(
            hashlib.sha256(
                code_verifier.encode("utf-8")
            ).digest()
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    create_oauth_session(
        db=db,
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


@router.get("/callback")
def salesforce_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
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
                    "Salesforce authorization failed."
                ),
                "error": error,
                "description": error_description,
            },
        )

    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing Salesforce authorization "
                "code or state."
            ),
        )

    oauth_session = get_oauth_session(
        db=db,
        state=state,
    )

    if oauth_session is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid or expired Salesforce "
                "OAuth session."
            ),
        )

    try:
        token_response = exchange_authorization_code(
            code=code,
            code_verifier=(
                oauth_session.code_verifier
            ),
        )

        access_token = token_response.get(
            "access_token"
        )

        refresh_token = token_response.get(
            "refresh_token"
        )

        instance_url = token_response.get(
            "instance_url"
        )

        token_type = token_response.get(
            "token_type",
            "Bearer",
        )

        if not access_token or not instance_url:
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
        remove_oauth_session(
            db=db,
            state=state,
        )

    return {
        "message": (
            "Salesforce authorization successful."
        ),
        "instance_url": instance_url,
        "token_type": token_type,
        "refresh_token_available": bool(
            refresh_token
        ),
    }