import os
import secrets
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv


load_dotenv()


SALESFORCE_API_VERSION = os.getenv(
    "SALESFORCE_API_VERSION",
    "v66.0",
)

SALESFORCE_LOGIN_URL = os.getenv(
    "SALESFORCE_LOGIN_URL",
    "https://login.salesforce.com",
)

SALESFORCE_CLIENT_ID = os.getenv("SALESFORCE_CLIENT_ID")
SALESFORCE_CLIENT_SECRET = os.getenv("SALESFORCE_CLIENT_SECRET")

SALESFORCE_CALLBACK_URL = os.getenv(
    "SALESFORCE_CALLBACK_URL",
    "http://localhost:8000/api/v1/salesforce/callback",
)


class SalesforceAPIError(Exception):
    """Raised when the Salesforce API returns an error."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        response_data: object | None = None,
    ):
        super().__init__(message)

        self.message = message
        self.status_code = status_code
        self.response_data = response_data

    def __str__(self) -> str:
        if self.status_code is not None:
            return f"{self.message} (HTTP {self.status_code})"

        return self.message


def is_salesforce_configured() -> bool:
    required_values = (
        SALESFORCE_CLIENT_ID,
        SALESFORCE_CLIENT_SECRET,
    )

    return all(required_values)


def generate_pkce_verifier() -> str:
    return secrets.token_urlsafe(64)


def generate_authorization_url(
    code_challenge: str,
    state: str,
) -> str:
    if not is_salesforce_configured():
        raise RuntimeError(
            "Salesforce configuration is incomplete."
        )

    params = {
        "response_type": "code",
        "client_id": SALESFORCE_CLIENT_ID,
        "redirect_uri": SALESFORCE_CALLBACK_URL,
        "scope": "api refresh_token",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    return (
        f"{SALESFORCE_LOGIN_URL}/services/oauth2/authorize?"
        f"{urlencode(params)}"
    )


def exchange_authorization_code(
    code: str,
    code_verifier: str,
) -> dict:
    if not is_salesforce_configured():
        raise RuntimeError(
            "Salesforce configuration is incomplete."
        )

    try:
        response = requests.post(
            f"{SALESFORCE_LOGIN_URL}/services/oauth2/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": SALESFORCE_CLIENT_ID,
                "client_secret": SALESFORCE_CLIENT_SECRET,
                "redirect_uri": SALESFORCE_CALLBACK_URL,
                "code_verifier": code_verifier,
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise SalesforceAPIError(
            f"Unable to connect to Salesforce during OAuth token exchange: {exc}"
        ) from exc

    if not response.ok:
        try:
            response_data = response.json()
        except ValueError:
            response_data = response.text

        raise SalesforceAPIError(
            "Salesforce OAuth token exchange failed.",
            status_code=response.status_code,
            response_data=response_data,
        )

    try:
        return response.json()
    except ValueError as exc:
        raise SalesforceAPIError(
            "Salesforce returned an invalid OAuth token response.",
            status_code=response.status_code,
            response_data=response.text,
        ) from exc


def refresh_salesforce_access_token(
    refresh_token: str,
) -> dict:
    """
    Exchange a Salesforce refresh token for a new access token.
    """

    if not is_salesforce_configured():
        raise RuntimeError(
            "Salesforce configuration is incomplete."
        )

    try:
        response = requests.post(
            f"{SALESFORCE_LOGIN_URL}/services/oauth2/token",
            data={
                "grant_type": "refresh_token",
                "client_id": SALESFORCE_CLIENT_ID,
                "client_secret": SALESFORCE_CLIENT_SECRET,
                "refresh_token": refresh_token,
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise SalesforceAPIError(
            f"Unable to connect to Salesforce while refreshing the access token: {exc}"
        ) from exc

    if not response.ok:
        try:
            response_data = response.json()
        except ValueError:
            response_data = response.text

        raise SalesforceAPIError(
            "Salesforce access token refresh failed.",
            status_code=response.status_code,
            response_data=response_data,
        )

    try:
        return response.json()
    except ValueError as exc:
        raise SalesforceAPIError(
            "Salesforce returned an invalid refresh token response.",
            status_code=response.status_code,
            response_data=response.text,
        ) from exc


def build_salesforce_lead_payload(
    lead_data: dict,
) -> dict:
    payload = {
        "FirstName": lead_data.get("first_name"),
        "LastName": lead_data.get("last_name"),
        "Company": lead_data.get("company"),
        "Email": lead_data.get("email"),
        "Phone": lead_data.get("phone"),
        "Title": lead_data.get("title"),
        "LinkedIn_URL__c": lead_data.get("linkedin_url"),
        "Event__c": lead_data.get("event"),
        "Capture_Source__c": lead_data.get("capture_source"),
        "Notes__c": lead_data.get("notes"),
        "Lead_Interest__c": lead_data.get("lead_interest"),
        "Follow_Up_Action__c": lead_data.get("follow_up_action"),
        "Status": lead_data.get("status") or "New",
        "Rating": lead_data.get("rating"),
    }

    return {
        key: value
        for key, value in payload.items()
        if value is not None
    }


def create_salesforce_lead(
    access_token: str,
    instance_url: str,
    lead_data: dict,
) -> dict:
    """Create a Lead record in Salesforce."""

    url = (
        f"{instance_url.rstrip('/')}"
        f"/services/data/{SALESFORCE_API_VERSION}/sobjects/Lead/"
    )

    payload = build_salesforce_lead_payload(lead_data)

    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise SalesforceAPIError(
            f"Unable to connect to Salesforce while creating Lead: {exc}"
        ) from exc

    if not response.ok:
        try:
            response_data = response.json()
        except ValueError:
            response_data = response.text

        message = "Salesforce Lead creation failed."

        if isinstance(response_data, list) and response_data:
            first_error = response_data[0]

            if isinstance(first_error, dict):
                error_message = first_error.get("message")
                error_code = first_error.get("errorCode")

                if error_message:
                    message = error_message

                if error_code:
                    message = f"{message} [{error_code}]"

        elif isinstance(response_data, dict):
            error_message = response_data.get("message")

            if error_message:
                message = error_message

        raise SalesforceAPIError(
            message,
            status_code=response.status_code,
            response_data=response_data,
        )

    try:
        return response.json()
    except ValueError as exc:
        raise SalesforceAPIError(
            "Salesforce created the Lead but returned an invalid response.",
            status_code=response.status_code,
            response_data=response.text,
        ) from exc