# 구현 상태와 실행 방법

기준일: 2026-08-21

## 완료된 백엔드 범위

- Java 21 + Spring Boot 3.4.5 공개 REST API
- PostgreSQL + Flyway V1~V3, Hibernate schema validation
- 회원가입, Argon2 password hash, 로그인, user ID 기반 JWT
- Google/GitHub/Kakao/Naver OAuth 진입 경로, 설정 Provider 조회, PKCE
- Challenge 목록·상세·관리자 CRUD(삭제는 기록 보존형 비활성화)
- 안전한 Artifact 업로드·교체·삭제·다운로드
- FLAG 검증, 오답 Submission 기록, Rate Limit
- DB 잠금 + Unique Constraint 기반 중복/동시 점수 지급 방지
- Ranking, My Page Profile/Solve/Submission/Dashboard, Home 통계
- General/Solver Challenge Discussion과 Solve 기반 접근 제어
- Community Post/Comment CRUD, 작성자·관리자 권한, NOTICE 권한
- Community 작성 Rate Limit과 페이지네이션
- JSON 401/403/404/409/422/429/500 오류 계약
- FastAPI 내부 Artifact 분석 서비스와 내부 키 인증

상세 요청·응답은 [API_CONTRACT.md](API_CONTRACT.md)를 기준으로 한다.

## 검증 결과

- `backend`: Java 21 `clean test` 성공, Spring 테스트 7개(통합·보안 포함)
- PostgreSQL 16.15 실제 임시 인스턴스: Flyway V1→V2→V3 및 Hibernate `validate` 성공
- `fastapi`: pytest 3개 성공
- 확인 항목: 비인증 401, 일반 사용자 Admin 403, FLAG/hash 비노출, 오답 기록 보존, 중복·동시 정답 점수 1회, 비공개 문제 차단, Solver 전용 접근, Community IDOR 방어, Artifact 확장자·경로 방어

## 로컬 실행

```powershell
cd D:\mini-ctf
Copy-Item .env.example .env
# DATABASE_PASSWORD, JWT_SECRET, ADMIN_PASSWORD, INTERNAL_SERVICE_KEY를 반드시 변경
docker compose up -d postgres

cd backend
$env:JAVA_HOME='C:\Path\To\JDK-21'
.\gradlew.bat bootRun
```

Frontend는 `http://localhost:5173`, API는 `http://localhost:8080`, OpenAPI는 `http://localhost:8080/swagger-ui.html`을 사용한다.

FastAPI 내부 서비스가 필요한 경우:

```powershell
cd D:\mini-ctf\fastapi
.\.venv\Scripts\Activate.ps1
$env:INTERNAL_SERVICE_KEY='32자 이상의 별도 내부 키'
uvicorn app.main:app --port 8000
```

FastAPI는 브라우저에서 직접 호출하지 않는다. Challenge runner는 격리 실행기가 연결되지 않았으므로 현재 명시적으로 `501 Not Implemented`를 반환한다.

## 다음 단계

백엔드와 DB 계약은 프론트 연결 가능한 상태다. 다음 작업은 `frontend/`의 타입과 API client를 [API_CONTRACT.md](API_CONTRACT.md)에 맞추고 화면별 정상·로딩·빈 상태·오류·인증 만료 상태를 연결하는 것이다.
