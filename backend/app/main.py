"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, scenes
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "API for the NASA Space Apps Challenge 2026 challenge *Dancing with the SARs*. "
        "It exposes study areas, NISAR acquisitions and change layers."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(scenes.router, prefix="/api")


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    """Small landing payload so hitting the root is not a 404."""
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}
