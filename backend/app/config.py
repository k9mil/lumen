from pydantic_settings import BaseSettings, SettingsConfigDict

from lumen_agents import AgentConfig


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./lumen.db"
    GOOGLE_API_KEY: str = ""
    COMPANIES_HOUSE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-pro-preview"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-2-preview"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    def to_agent_config(self) -> AgentConfig:
        """Convert settings to AgentConfig for pipeline."""
        return AgentConfig(
            google_api_key=self.GOOGLE_API_KEY,
            companies_house_api_key=self.COMPANIES_HOUSE_API_KEY,
            timeout_seconds=15.0,
            max_retries=2,
        )


settings = Settings()
