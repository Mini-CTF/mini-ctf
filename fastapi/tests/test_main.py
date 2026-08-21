import os

from fastapi.testclient import TestClient

os.environ.setdefault("INTERNAL_SERVICE_KEY", "test-internal-key-that-is-at-least-32-chars")

from app.main import app, settings  # noqa: I001


client = TestClient(app)
KEY = os.environ["INTERNAL_SERVICE_KEY"]


def test_health() -> None:
    response = client.get("/internal/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_artifact_analysis_requires_key_and_blocks_traversal(tmp_path) -> None:
    settings.artifact_storage_root = tmp_path
    artifact = tmp_path / "sample.txt"
    artifact.write_text("mini-ctf", encoding="utf-8")

    assert (
        client.post("/internal/artifacts/analyze", json={"relative_path": "sample.txt"}).status_code
        == 401
    )
    response = client.post(
        "/internal/artifacts/analyze",
        headers={"X-Internal-Service-Key": KEY},
        json={"relative_path": "sample.txt"},
    )
    assert response.status_code == 200
    assert response.json()["size_bytes"] == 8
    assert response.json()["file_type"] == "txt"

    traversal = client.post(
        "/internal/artifacts/analyze",
        headers={"X-Internal-Service-Key": KEY},
        json={"relative_path": "../secret.txt"},
    )
    assert traversal.status_code == 404


def test_runner_reports_not_implemented() -> None:
    response = client.post(
        "/internal/challenges/execute",
        headers={"X-Internal-Service-Key": KEY},
        json={"challenge_id": 1, "operation": "prepare"},
    )
    assert response.status_code == 501
