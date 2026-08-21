from __future__ import annotations

import hashlib
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    internal_service_key: str = Field(min_length=32)
    artifact_storage_root: Path = Path("../challenges")
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
app = FastAPI(title="Mini CTF Internal Service", version="0.1.0")


class ArtifactAnalysisRequest(BaseModel):
    relative_path: str = Field(min_length=1, max_length=500)


class ArtifactAnalysisResponse(BaseModel):
    relative_path: str
    size_bytes: int
    sha256: str
    file_type: str


class ChallengeExecutionRequest(BaseModel):
    challenge_id: int = Field(gt=0)
    operation: str = Field(pattern="^(prepare|validate|cleanup)$")


def require_internal_key(x_internal_service_key: str | None = Header(default=None)) -> None:
    if x_internal_service_key is None or not secrets.compare_digest(
        x_internal_service_key, settings.internal_service_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal service key"
        )


@app.get("/internal/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "fastapi-internal"}


@app.post(
    "/internal/artifacts/analyze",
    response_model=ArtifactAnalysisResponse,
    dependencies=[Depends(require_internal_key)],
)
def analyze_artifact(request: ArtifactAnalysisRequest) -> ArtifactAnalysisResponse:
    root = settings.artifact_storage_root.resolve()
    target = (root / request.relative_path).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")
    digest = hashlib.sha256()
    with target.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return ArtifactAnalysisResponse(
        relative_path=request.relative_path,
        size_bytes=target.stat().st_size,
        sha256=digest.hexdigest(),
        file_type=target.suffix.lower().lstrip(".") or "unknown",
    )


@app.post("/internal/challenges/execute", dependencies=[Depends(require_internal_key)])
def execute_challenge(request: ChallengeExecutionRequest) -> dict[str, object]:
    # 실제 격리 실행기가 연결되기 전에는 실행 요청을 성공으로 위장하지 않는다.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Challenge runner is not configured"
    )
