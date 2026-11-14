"""Application settings, loaded from environment variables / .env."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration.

    Environment variables use the ``SAR_API_`` prefix, e.g. ``SAR_API_CORS_ORIGINS``.
    The Earthdata credentials (``EARTHDATA_USERNAME`` / ``EARTHDATA_PASSWORD``) are read
    directly from the environment by the download script and are never exposed by the API.
    """

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_prefix="SAR_API_",
        extra="ignore",
    )

    app_name: str = "Dancing with the SARs API"
    version: str = "0.1.0"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    data_dir: Path = Path("../data")

    @property
    def cors_origin_list(self) -> list[str]:
        """Split the comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()
