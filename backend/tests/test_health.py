"""Smoke tests for the public API contract."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["version"]


def test_study_areas() -> None:
    response = client.get("/api/study-areas")
    assert response.status_code == 200
    areas = response.json()
    assert isinstance(areas, list)
    if areas:
        assert {"id", "name", "bbox"} <= areas[0].keys()


def test_scenes_empty_by_default() -> None:
    response = client.get("/api/scenes")
    assert response.status_code == 200
    assert response.json() == []


def test_root() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["health"] == "/api/health"
