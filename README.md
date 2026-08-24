Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Mini CTF

## 학습 원칙

- 실제 서비스나 타인을 대상으로 하지 않는 안전한 연습 환경에서만 학습합니다.
- 첫 문제는 작은 단서 하나부터 시작하며, 힌트 사용은 학습 과정의 자연스러운 일부입니다.
- 점수와 랭킹보다 이해와 꾸준한 시도를 우선합니다.

문제를 탐색하고 Artifact를 분석한 뒤 FLAG를 제출해 점수와 순위를 얻는 웹 기반 CTF 학습 플랫폼입니다. 플랫폼 자체의 인증·권한·입력 검증·파일 처리도 안전하게 구현하는 것을 목표로 합니다.

## 현재 상태

Spring Boot 공개 API, PostgreSQL 스키마, FastAPI 내부 분석 서비스는 구현과 테스트를 마쳤습니다. React 클라이언트는 기본 화면과 인증·Challenge·Ranking 연동이 있으나, 실제 API 계약에 맞춘 타입 보정과 Community·Admin·상세 My Page 화면 연결이 남아 있습니다.

정확한 완료 범위는 [구현 상태](docs/IMPLEMENTATION_STATUS.md), 프론트 연동 형식은 [API 계약](docs/API_CONTRACT.md)을 기준으로 합니다.

## 아키텍처

```text
Browser
  └─ React + TypeScript
       └─ Spring Boot REST API
            ├─ PostgreSQL
            └─ FastAPI internal service (선택)
```

- Spring Boot는 인증, 권한, 사용자, Challenge, FLAG, 점수, Ranking, Community와 DB 트랜잭션을 소유합니다.
- PostgreSQL 스키마는 Flyway로만 변경합니다.
- FastAPI는 Artifact 분석과 향후 격리 실행을 위한 내부 서비스이며 브라우저에 노출하지 않습니다.
- React는 `/api` 아래 Spring Boot API만 호출합니다.

## 주요 기능

- username/password 회원가입·로그인과 JWT
- Google·GitHub·Discord·Naver OAuth2 진입 구조와 PKCE
- Challenge 목록·상세, FLAG 제출, Artifact 다운로드
- 중복·동시 정답 점수 지급 방지와 제출 기록
- Ranking, 통계, My Page 데이터
- General·Solver Challenge Discussion
- Community 게시글·댓글과 작성자·관리자 권한
- 관리자 Challenge CRUD와 Artifact 관리
- 입력 검증, Rate Limit, 안전한 JSON 오류 응답

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React, TypeScript, Vite, React Router |
| Public API | Java 21, Spring Boot 3.4.5, Spring Security, JPA |
| Database | PostgreSQL 16, Flyway |
| Internal API | Python 3.11+, FastAPI |
| Test | JUnit, MockMvc, H2, pytest |

## 저장소 구조

```text
mini-ctf/
├─ backend/                 Spring Boot API, Flyway, Java 테스트
│  └─ src/
│     ├─ main/java/com/minictf/
│     ├─ main/resources/db/migration/
│     └─ test/java/com/minictf/
├─ frontend/                React 클라이언트
│  └─ src/{api,components,hooks,pages,types}/
├─ fastapi/                 내부 Artifact 분석 서비스와 pytest
├─ challenges/              배포 Artifact 저장 루트
├─ docs/                    API·DB·구현 상태 문서
├─ AGENTS.md                저장소 작업 규칙
├─ DESIGN.md                UI/UX 기준
├─ docker-compose.yml       로컬 PostgreSQL
└─ .env.example             공통 환경 변수 예시
```

빌드 결과, 의존성, 가상환경, 실제 `.env`, 런타임 업로드는 Git에서 제외됩니다.

## 빠른 시작

### 1. 요구 사항

- JDK 21
- Node.js LTS와 npm
- Python 3.11 이상(내부 서비스 사용 시)
- Docker Desktop 또는 별도 PostgreSQL 16

### 2. 환경 변수

저장소 루트에서 예시 파일을 복사합니다.

```powershell
Copy-Item .env.example .env
```

최소한 다음 값을 강한 임의 문자열로 교체합니다.

- `DATABASE_PASSWORD`
- `JWT_SECRET` (32자 이상)
- `ADMIN_PASSWORD` (12자 이상)
- `INTERNAL_SERVICE_KEY` (FastAPI 사용 시 32자 이상)

실제 `.env`는 커밋하지 않습니다.

### 3. PostgreSQL

```powershell
docker compose up -d postgres
```

Spring Boot 시작 시 Flyway `V1`→`V2`→`V3`가 적용되고 Hibernate가 스키마를 검증합니다.

### 4. Backend

```powershell
cd backend
.\gradlew.bat bootRun
```

- API: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 5. Frontend

새 터미널에서 실행합니다.

```powershell
cd frontend
npm install
npm run dev
```

웹 클라이언트는 `http://localhost:5173`에서 실행되며 Vite가 `/api`를 Backend로 프록시합니다.

### 6. FastAPI 내부 서비스(선택)

```powershell
cd fastapi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
$env:INTERNAL_SERVICE_KEY='replace-with-at-least-32-random-characters'
uvicorn app.main:app --port 8000
```

현재 Artifact 분석 API를 제공하며, 격리 실행기가 없는 실행 API는 의도적으로 `501 Not Implemented`를 반환합니다.

## 테스트

```powershell
# Spring Boot
cd backend
.\gradlew.bat spotlessCheck clean test

# React production build
cd ..\frontend
npm run format:check
npm run build

# FastAPI
cd ..\fastapi
.\.venv\Scripts\ruff.exe format --check .
.\.venv\Scripts\ruff.exe check .
.\.venv\Scripts\python.exe -m pytest -q
```

Java는 Spotless, 프론트 소스는 Prettier 설정을 저장소에 고정했습니다. 수정 후 `spotlessApply` 또는 `npm run format`으로 자동 정리할 수 있습니다.

## 문서

| 문서 | 내용 |
|---|---|
| [AGENTS.md](AGENTS.md) | 작업 범위, 보안 불변 조건, 검증 규칙 |
| [DESIGN.md](DESIGN.md) | 색상, 레이아웃, 컴포넌트, 접근성 |
| [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) | 완료·미완료 기능과 최근 검증 결과 |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | 프론트 연동용 REST API 계약 |
| [docs/DATABASE_GUIDE.md](docs/DATABASE_GUIDE.md) | Flyway와 PostgreSQL 운영 규칙 |
| [fastapi/README.md](fastapi/README.md) | 내부 서비스 실행과 역할 |
| [challenges/README.md](challenges/README.md) | Challenge Artifact 배치 규칙 |

## 다음 작업

1. 프론트 타입과 오류 처리를 API 계약에 맞춥니다.
2. 인증이 필요한 Artifact 다운로드를 Blob 방식으로 연결합니다.
3. My Page, Community, Challenge Discussion, Admin 화면을 구현합니다.
4. 회원가입부터 점수·Ranking 반영까지 브라우저 통합 테스트를 수행합니다.
5. 운영 OAuth 키, HTTPS, DB 백업과 모니터링을 구성합니다.
