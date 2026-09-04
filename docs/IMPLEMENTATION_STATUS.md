# FlagBox 구현 상태

기준일: 2026-09-04

## 현재 구성

- Frontend: React, TypeScript, Vite, React Router (Vercel)
- Backend: Java 21, Spring Boot, Spring Security, JPA (Render)
- Database: PostgreSQL, Flyway (Render)
- 보조 서비스: FastAPI 내부 Artifact 분석 서비스

## 제공 기능

- 일반 계정 및 Google, GitHub, Discord OAuth 로그인
- JWT 기반 인증, 단일 활성 세션, `USER`·`MODERATOR`·`ADMIN` 역할 권한
- CTF 문제 조회, Artifact 다운로드, 무료 힌트, FLAG 제출, 점수·랭킹
- 한국 시간(Asia/Seoul) 기준 일일 출석과 연속 출석 기록
- 학습 아티클, 북마크, 학습 목표, 업적, 알림
- 커뮤니티 게시글·대댓글·반응·공지사항 및 신고
- 프로필, 아바타, 친구 요청, DM, 공개 프로필
- 관리자·부관리자용 사용자/콘텐츠/공지/보안·감사 로그 관리
- 로그인 후 계정별로 이어지는 시작 튜토리얼

## 보안 및 데이터 원칙

- 비밀번호는 해시로 저장하고, API는 JWT 인증과 역할 권한을 확인한다.
- FLAG와 비밀번호 해시는 API 응답에 포함하지 않는다.
- 제출·출석·반응 등은 DB 제약과 트랜잭션으로 중복 처리를 막는다.
- Flyway 마이그레이션으로만 운영 DB 구조를 변경한다.
- 상점, 루비, 보관함, 프로필 테두리·일반 칭호, 유료 힌트 크레딧은 제거했다.
  `SUPER_USER`, `SUB_ADMIN` 표시는 꾸미기 데이터가 아니라 사용자 역할에서 계산된다.

## 검증 명령

```powershell
cd backend
.\gradlew.bat test

cd ..\frontend
npm run lint
npm run build
git diff --check
```

V29 마이그레이션은 상점/화폐/꾸미기 관련 테이블과 컬럼을 제거한다. 자세한 구조는
[DATABASE_GUIDE.md](DATABASE_GUIDE.md)를 참고한다.
