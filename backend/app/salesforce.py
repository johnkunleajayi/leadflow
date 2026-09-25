import os


SALESFORCE_LOGIN_URL = os.getenv(
    "SALESFORCE_LOGIN_URL",
    "https://login.salesforce.com",
)

SALESFORCE_CLIENT_ID = os.getenv("SALESFORCE_CLIENT_ID")
SALESFORCE_CLIENT_SECRET = os.getenv("SALESFORCE_CLIENT_SECRET")
SALESFORCE_USERNAME = os.getenv("SALESFORCE_USERNAME")
SALESFORCE_PASSWORD = os.getenv("SALESFORCE_PASSWORD")
SALESFORCE_SECURITY_TOKEN = os.getenv("SALESFORCE_SECURITY_TOKEN")


def is_salesforce_configured() -> bool:
    """Return True when all required Salesforce credentials are available."""

    required_values = (
        SALESFORCE_CLIENT_ID,
        SALESFORCE_CLIENT_SECRET,
        SALESFORCE_USERNAME,
        SALESFORCE_PASSWORD,
        SALESFORCE_SECURITY_TOKEN,
    )

    return all(required_values)