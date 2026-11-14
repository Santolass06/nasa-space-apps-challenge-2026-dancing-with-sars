"""Study areas and available SAR scenes.

These endpoints are intentionally thin for now: they define the contract the frontend
uses, while the data pipeline is being built. Replace the in-memory examples with a
search over ``data/processed`` (or a small metadata database) when available.
"""

from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["sar"])


class StudyArea(BaseModel):
    """A place the story is about."""

    id: str
    name: str
    description: str
    bbox: tuple[float, float, float, float] = Field(
        description="Bounding box as (min_lon, min_lat, max_lon, max_lat), EPSG:4326"
    )
    highlight: str = Field(default="", description="Short hook shown in the UI")


class Scene(BaseModel):
    """One SAR acquisition."""

    id: str
    acquired_on: date
    platform: str = "NISAR"
    polarization: str = "VV"
    thumbnail_url: str | None = None


STUDY_AREAS: list[StudyArea] = [
    StudyArea(
        id="example",
        name="Add your study area",
        description=(
            "Placeholder. Pick a place where surface change is visible in NISAR data: "
            "a wetland, glacier, wildfire scar, flooded neighbourhood or agricultural region."
        ),
        bbox=(-122.5, 37.7, -121.9, 38.1),
        highlight="Replace this with the story of the place.",
    )
]


@router.get("/study-areas", response_model=list[StudyArea])
def list_study_areas() -> list[StudyArea]:
    """Return the curated study areas shown in the application."""
    return STUDY_AREAS


@router.get("/scenes", response_model=list[Scene])
def list_scenes(
    area_id: str | None = None,
    start: date | None = None,
    end: date | None = None,
) -> list[Scene]:
    """Return available acquisitions for an area and date range.

    Not implemented yet: returns an empty list until the NISAR search/cache lands.
    """
    _ = (area_id, start, end)
    return []
