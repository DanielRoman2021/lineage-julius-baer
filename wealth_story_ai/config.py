"""Central configuration for the Lineage backend.

Reads from environment / .env. The single most important derived flag is
``live_mode``: when no ANTHROPIC_API_KEY is present the whole pipeline falls
back to high-quality canned artifacts so the demo runs offline and identically.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str = ""
    anthropic_model_specialist: str = "claude-sonnet-4-6"
    anthropic_model_synthesis: str = "claude-opus-4-8"
    confidence_threshold: float = 0.70
    cors_origins: str = "http://localhost:3000"

    mongodb_uri: str = ""
    mongodb_db: str = "lineage"

    data_dir: Path = BASE_DIR / "data"
    documents_dir: Path = BASE_DIR / "documents"

    @property
    def live_mode(self) -> bool:
        """True when we can make real Anthropic calls."""
        return bool(self.anthropic_api_key.strip())

    @property
    def mongo_enabled(self) -> bool:
        return bool(self.mongodb_uri.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
