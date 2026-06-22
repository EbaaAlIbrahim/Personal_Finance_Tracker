import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    ENV_MODE: str = "development"
    
    # Adding optional fallback assignment strings prevents Pydantic from crashing the cloud build
    ENCRYPTION_KEY: Optional[str] = "fallback_local_encryption_key_32bytes="
    JWT_SECRET_KEY: Optional[str] = "fallback_local_jwt_secret_signing_key_node"
    
    DATABASE_URL: str = "sqlite:///./local_fallback.db"
    
    PLAID_CLIENT_ID: Optional[str] = "sandbox"
    PLAID_SECRET: Optional[str] = "sandbox_secret"
    PLAID_ENV: str = "sandbox"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        extra="ignore"
    )

# Instantiate settings safely for import across our modules
settings = Settings()
