Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Mini CTF FastAPI 내부 서비스

이 서비스는 Java/Spring Boot 공개 REST API를 보조하는 내부 REST 서비스다.

현재 역할:

- 문제 Artifact 안전 분석
- 향후 격리된 문제 실행기 확장 지점
- 내부 서비스 인증 키 확인

FastAPI는 사용자 로그인, JWT 발급, 점수 계산, Solve 생성, PostgreSQL 스키마 변경을 담당하지 않는다. 브라우저에서 직접 호출하지 않고 Spring Boot가 서버 간 요청으로 호출한다.

## 실행

```powershell
cd D:\mini-ctf\fastapi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:INTERNAL_SERVICE_KEY="replace-with-at-least-32-random-characters"
uvicorn app.main:app --reload --port 8000
```

확인 주소:

- Health: `http://localhost:8000/internal/health`
- OpenAPI: `http://localhost:8000/docs`

운영 환경에서는 `INTERNAL_SERVICE_KEY`를 반드시 강한 랜덤 값으로 설정하고 외부에 포트를 공개하지 않는다.

격리 실행기가 아직 연결되지 않았으므로 `/internal/challenges/execute`는 성공 응답을 가장하지 않고 `501 Not Implemented`를 반환한다.

테스트:

```powershell
pip install -r requirements-dev.txt
ruff format --check .
ruff check .
python -m pytest -q
```
