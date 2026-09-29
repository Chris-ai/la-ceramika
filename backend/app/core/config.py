from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://la_ceramica:la_ceramica@127.0.0.1:5433/la_ceramica"
    )
    brandfetch_api_key: str = ""
    unsplash_access_key: str = ""

    @field_validator("database_url")
    @classmethod
    def normalize_local_database_host(cls, value: str) -> str:
        return value.replace("@localhost:", "@127.0.0.1:")

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", PROJECT_DIR / ".env"),
        extra="ignore",
    )


settings = Settings()
