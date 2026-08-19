# 구현 상태와 실행 방법

## 현재 구현된 범위

- Java 21 + Spring Boot REST API
- React + TypeScript + Vite 클라이언트
- PostgreSQL 운영 스키마와 Flyway 마이그레이션
- H2 테스트 프로필
- 회원가입, 로그인, Argon2 비밀번호 해시, JWT 인증
- Google/GitHub/Kakao/Naver OAuth 진입 경로 스캐폴드
- 문제 목록·상세·아티팩트 다운로드·FLAG 제출
- 중복 풀이 방지, 점수, 랭킹, 제출 Rate Limit
- 사용자 풀이/제출 조회
- 관리자 문제 CRUD API
- Swagger/OpenAPI 문서 경로

Community 게시판/댓글은 데이터베이스 테이블과 설계 문서까지 준비되어 있으며, CTF 핵심 MVP 이후 구현 대상으로 남겨두었습니다.

## 로컬 실행

PostgreSQL을 사용할 때:

```powershell
cd D:\mini-ctf
docker compose up -d postgres

cd backend
.\gradlew.bat bootRun
```

프론트엔드:

```powershell
cd D:\mini-ctf\frontend
npm install
npm run dev
```

브라우저 주소는 `http://localhost:5173`이며 API는 `http://localhost:8080`입니다.

외부 DB 없이 확인할 때:

```powershell
cd D:\mini-ctf\backend
.\gradlew.bat bootRun --args="--spring.profiles.active=test"
```

## OAuth 설정

OAuth 버튼은 현재 Google, GitHub, Kakao, Naver 진입 경로를 제공합니다. 실제 외부 로그인을 사용하려면 해당 Provider의 Client ID/Secret과 Redirect URI를 환경 변수로 설정해야 합니다. 기본 회원가입/로그인은 OAuth 설정 없이도 동작합니다.

운영 환경에서는 `.env.example`을 참고하여 `JWT_SECRET`, DB 비밀번호, OAuth Secret을 별도로 설정하고 커밋하지 않습니다.

## 검증 명령

```powershell
cd D:\mini-ctf\backend
.\gradlew.bat clean test

cd ..\frontend
npm run build
```

