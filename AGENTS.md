Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Mini CTF 저장소 작업 지침

## 프로젝트 목표

Mini CTF는 React 클라이언트에서 문제를 탐색하고 FLAG를 제출해 점수와 순위를 얻는 보안 학습 플랫폼이다. 기능 수보다 보안, 정확성, 핵심 사용자 흐름, 유지보수성 순으로 우선한다.

## 문서의 단일 기준

작업 전 관련 문서를 읽고 실제 코드와 대조한다.

| 주제 | 기준 문서 |
|---|---|
| 프로젝트 소개·실행·폴더 구조 | `README.md` |
| UI 토큰·화면·접근성 | `DESIGN.md` |
| 구현 완료·미완료 범위 | `docs/IMPLEMENTATION_STATUS.md` |
| 공개 REST API 요청·응답 | `docs/API_CONTRACT.md` |
| PostgreSQL·Flyway 운영 | `docs/DATABASE_GUIDE.md` |
| FastAPI 내부 서비스 | `fastapi/README.md` |
| Challenge 파일 배치 | `challenges/README.md` |

요구사항이나 상태를 여러 문서에 복제하지 않는다. 코드가 바뀌면 해당 기준 문서만 함께 갱신한다.

## 서비스 경계

- `frontend/`: React, TypeScript, Vite 기반 웹 클라이언트. 브라우저는 Spring Boot 공개 API만 호출한다.
- `backend/`: Java 21, Spring Boot 공개 REST API와 PostgreSQL 업무 데이터의 유일한 소유자다.
- `fastapi/`: 파일 분석기와 향후 격리 실행기를 위한 내부 서비스다. 인증, 점수, Solve, DB 스키마를 소유하지 않는다.
- `challenges/`: CTF 배포 파일 저장 루트다. 런타임 관리 업로드는 `challenges/uploads/` 아래에 둔다.
- `docs/`: 상세 계약과 운영 문서를 둔다.

같은 업무 API를 Spring Boot와 FastAPI에 중복 구현하지 않는다.

## 기본 작업 순서

1. `git status --short`와 관련 파일을 확인한다.
2. 기존 코드·테스트·문서 계약을 재사용한다.
3. 필요한 최소 범위를 변경한다.
4. 보안과 데이터 마이그레이션 영향을 확인한다.
5. 영역별 테스트를 실행한다.
6. 실제 동작과 기준 문서를 함께 맞춘다.
7. 변경 파일, 검증 결과, 남은 위험을 간결하게 보고한다.

기존 사용자의 변경을 되돌리거나 덮어쓰지 않는다. 과도한 추상화보다 고등학생 개발자도 읽을 수 있는 명확한 코드를 우선한다.

## 보안 불변 조건

- 비밀번호는 Argon2로 해시하며 평문을 저장하거나 기록하지 않는다.
- FLAG 검증, 점수 계산, Solve 생성, 인증과 권한 검사는 백엔드에서 수행한다.
- FLAG 원문·hash, password hash, JWT 전체 값, API key, OAuth secret을 응답·로그·프론트 번들에 노출하지 않는다.
- 관리자 API는 ADMIN 권한을, 개인 API는 현재 JWT 사용자를 기준으로 검증한다.
- Solver Discussion은 백엔드에서 Solve 기록을 확인한 사용자에게만 반환한다.
- 사용자 입력은 서버에서 길이·형식·허용 값을 검증한다.
- Community 콘텐츠는 HTML로 해석하지 않고 일반 텍스트로 렌더링한다.
- Artifact 경로를 정규화하고 저장 루트 밖 접근, 실행 확장자, 과도한 크기를 차단한다.
- FLAG·인증·Community 작성 API의 Rate Limit을 제거하지 않는다.
- CORS 전체 허용, Secret hard coding, 클라이언트 점수 전달을 금지한다.

## DB 변경 규칙

- 실행된 Flyway 파일 `V1`~`V3`는 수정하지 않는다.
- 스키마 변경은 다음 번호의 새 마이그레이션으로 추가한다.
- 엔티티와 PostgreSQL 스키마를 함께 검토한다.
- 운영 데이터 삭제 명령이나 볼륨 삭제는 명시적 요청과 백업 확인 없이 실행하지 않는다.
- Java/Spring Boot만 업무 스키마를 변경한다.

## 영역별 검증

```powershell
# Backend
cd backend
.\gradlew.bat spotlessCheck clean test

# Frontend
cd frontend
npm run format:check
npm run build

# FastAPI
cd fastapi
ruff format --check .
ruff check .
python -m pytest -q
```

변경 범위에 맞는 검증을 모두 실행한다. API 또는 DB가 바뀌면 통합 테스트와 문서 계약도 확인한다.

## 팀 작업 경계

- 사용자 기본 담당: `backend/`, `fastapi/`, DB, 공개 API 계약
- 팀원 기본 담당: `frontend/`, 화면, 상태 처리, 접근성
- 공동 담당: 문서, Docker, 테스트, Git/GitHub, 통합

사용자가 `나는 백엔드 담당이야`라고 말하면 백엔드·DB·API 파일을 우선 읽는다. `나는 프론트엔드 담당이야`라고 말하면 `frontend/`, `DESIGN.md`, `docs/API_CONTRACT.md`를 우선 읽는다. 통합 요청은 두 영역을 함께 검토한다.

브랜치는 필요할 때 `backend/<feature>` 또는 `frontend/<feature>` 형식을 사용한다. 강제 push, hard reset, 추적되지 않은 파일 일괄 삭제는 명시적 요청 없이 실행하지 않는다. `.env`와 인증 정보는 절대 커밋하지 않는다.

## Codex 컨텍스트 관리

- 컨텍스트 사용량이 40% 이상이고 실행 환경이 지원하면 별도 허가 없이 `/compact`를 실행한 뒤 현재 작업을 계속한다.
- `/compact`를 직접 실행할 수 없고 환경이 자동 축약하면 축약 결과를 이어받아 완료된 작업을 반복하지 않는다.
