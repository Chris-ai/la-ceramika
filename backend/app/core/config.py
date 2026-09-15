from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://la_ceramica:la_ceramica@127.0.0.1:5433/la_ceramica"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
