import plaid
from plaid.api import plaid_api
from app.config import settings

IS_MOCK_MODE = (
    settings.PLAID_CLIENT_ID == "your_plaid_client_id" or 
    not settings.PLAID_CLIENT_ID or 
    "your_" in settings.PLAID_CLIENT_ID
)

plaid_client = None

if not IS_MOCK_MODE:
    if settings.PLAID_ENV == "sandbox":
        plaid_host = plaid.Environment.Sandbox
    elif settings.PLAID_ENV == "development":
        plaid_host = plaid.Environment.Development
    else:
        plaid_host = plaid.Environment.Production

    configuration = plaid.Configuration(
        host=plaid_host,
        api_key={
            'clientId': settings.PLAID_CLIENT_ID,
            'secret': settings.PLAID_SECRET,
        }
    )
    api_client = plaid.ApiClient(configuration)
    plaid_client = plaid_api.PlaidApi(api_client)
