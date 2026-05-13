from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str | None = None
    database_url: str = "sqlite:///./geo_audits.db"
    openai_audit_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_enable_web_search: bool = True
    openai_max_citation_tests: int = 10
    request_timeout_seconds: float = 25.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
