from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="LUMEN_"
    )

    DATABASE_URL: str = "sqlite+aiosqlite:///./lumen.db"
    GOOGLE_API_KEY: str = ""
    COMPANIES_HOUSE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-pro-preview"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-2-preview"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]


settings = Settings()
