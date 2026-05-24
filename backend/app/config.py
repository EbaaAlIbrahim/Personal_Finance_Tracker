import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENV_MODE: str = "development"
    
    ENCRYPTION_KEY: str
    JWT_SECRET_KEY: str
    
    DATABASE_URL: str
    
    PLAID_CLIENT_ID: str
    PLAID_SECRET: str
    PLAID_ENV: str = "sandbox"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        extra="ignore"
    )

# Instantiate settings for import across our modules
settings = Settings()
