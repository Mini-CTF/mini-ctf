# FlagBox

FlagBox는 보안을 처음 배우는 사용자가 CTF 문제를 풀고, 학습 기록·출석·랭킹·커뮤니티를 이용하는 웹 기반 보안 학습 플랫폼이다.

## 아키텍처

```text
Browser → React + TypeScript (Vercel) → Spring Boot REST API (Render) → PostgreSQL (Render)
                                               └→ FastAPI 내부 Artifact 분석 서비스
```

- 프런트엔드는 화면과 사용자 상호작용을 담당한다.
- Spring Boot는 인증, 권한, 문제 채점, 출석, 커뮤니티, 관리자 기능을 처리한다.
- PostgreSQL은 사용자·문제·제출·출석·커뮤니티·감사 데이터를 보관한다.
- Flyway는 DB 변경 이력을 관리한다.

## 주요 기능

- 일반 계정 및 Google/GitHub/Discord OAuth 로그인
- JWT 인증, 역할 기반 권한(`USER`, `MODERATOR`, `ADMIN`)
- 문제 목록·상세, Artifact 다운로드, 무료 힌트, FLAG 제출, 랭킹
- 한국 시간 기준 출석 및 연속 출석
- 학습 아티클, 북마크, 목표, 업적, 알림
- 커뮤니티 글·대댓글·반응·공지·신고
- 프로필·아바타·친구·DM·공개 프로필
- 관리자/부관리자용 콘텐츠·계정·보안/감사 로그 관리
- 로그인 후 이어지는 계정별 시작 튜토리얼

상점, 루비, 보관함, 프로필 테두리·일반 칭호, 유료 힌트 크레딧은 더 이상 사용하지 않는다.
`SUPER_USER`, `SUB_ADMIN`은 사용자 역할에 따라 표시되는 권한 칭호다.

## 빠른 시작

```powershell
Copy-Item .env.example .env
docker compose up -d postgres

cd backend
.\gradlew.bat bootRun
```

별도 터미널에서 다음을 실행한다.

```powershell
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## 검증

```powershell
cd backend
.\gradlew.bat test

cd ..\frontend
npm run lint
npm run build
git diff --check
```

## 문서

- [구현 상태](docs/IMPLEMENTATION_STATUS.md)
- [DB 가이드](docs/DATABASE_GUIDE.md)
- [API 계약](docs/API_CONTRACT.md)
- [운영 가이드](docs/OPERATIONS_GUIDE.md)
- [OAuth 설정](docs/OAUTH_SETUP.md)
