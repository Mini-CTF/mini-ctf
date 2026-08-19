# README.md — Mini CTF Platform

# Mini CTF Platform

REST API와 React 웹 클라이언트로 다양한 정보보안 문제를 풀고 FLAG를 제출하여 점수와 랭킹을 얻을 수 있는 **웹 기반 미니 CTF 학습 플랫폼**입니다.

Dreamhack과 같은 보안 학습 서비스에서 아이디어를 얻었으며, 단순 문제 풀이 사이트를 넘어 **플랫폼 자체의 보안까지 고려한 웹 애플리케이션**을 목표로 합니다.

---

# 주요 목표

* Java 21 / Spring Boot 기반 서버 설계
* React / TypeScript 클라이언트 개발
* REST API 설계
* Database 설계
* 회원가입 / 로그인
* 사용자 인증 및 권한 관리
* 안전한 Password Hash
* FLAG 검증
* FLAG 제출 Rate Limiting
* 점수 / Ranking
* CTF 문제 제작
* Client / Backend 연동
* 웹 보안 적용
* Git / GitHub 협업

---

# 서비스 흐름

```text
User
 ↓
Register / Login
 ↓
Challenges
 ↓
Challenge Detail
 ↓
Artifact Download
 ↓
Solve Challenge
 ↓
Submit FLAG
 ↓
Rate Limit Check
 ↓
Backend Validation
 ↓
Solve
 ↓
Score
 ↓
Ranking
```

---

# 기술 스택

## Backend

```text
Java 21
Spring Boot 3
Spring Web MVC
Spring Data JPA
Bean Validation
JWT
Argon2
```

## Client

```text
React
TypeScript
Vite
React Router
TanStack Query
```

## Database

```text
PostgreSQL
```

## Development

```text
JDK 21
Gradle 또는 Maven
Node.js LTS
npm 또는 pnpm
Git
GitHub
VS Code
Codex
Cursor
```

VS Code를 기본 개발 환경으로 사용하며, Codex와 Cursor를 코드 작성·리뷰·문서화 보조 도구로 사용합니다. AI가 제안한 코드는 보안 검토와 테스트를 거친 뒤 반영하고, Secret·비밀번호·FLAG 원문은 입력하지 않습니다.

## 백엔드 구성 판단

핵심 업무 API는 Java Spring Boot 하나로 구현합니다. 인증, 권한, FLAG 검증, 점수, Rate Limiting, Solve 기록, DB 트랜잭션을 한 서비스에서 일관되게 처리해야 하기 때문입니다.

FastAPI를 Spring Boot와 같은 공개 업무 API로 병렬 운영하는 것은 이 프로젝트의 MVP에서는 권장하지 않습니다. FastAPI가 필요해지는 경우에만 문제 실행기·파일 분석기와 같은 격리된 내부 서비스로 추가하고, 공개 REST API와 DB 소유권은 Spring Boot에 둡니다.

따라서 기본 구성은 `Spring Boot REST API + React/TypeScript + 기존 PostgreSQL`입니다.

---

# 주요 기능

## User

* 회원가입
* 로그인
* Google 로그인
* GitHub / Kakao / Naver 로그인 확장
* 로그아웃
* 사용자 인증

기본 로그인은 username/password 방식과 Google OAuth 2.0 / OpenID Connect 방식을 함께 제공한다. OAuth 인증이 성공하면 Backend가 기존 인증 흐름과 동일하게 자체 JWT를 발급한다.

## Challenge

* 문제 목록
* 문제 상세
* Category
* Difficulty
* Artifact 제공
* FLAG 제출
* FLAG 검증

## Score

* 정답 시 점수 지급
* 동일 문제 중복 점수 방지
* Race Condition 방지

## Ranking

* 전체 사용자 순위
* 점수
* 해결 문제 수

## My Page

* 현재 점수
* 현재 Ranking
* Solve 목록
* 최근 제출 기록

## Admin

* 문제 등록
* 문제 수정
* 문제 삭제
* 문제 공개/비공개
* Artifact 관리

---

# Challenge Category

```text
WEB
CRYPTO
FORENSICS
MISC
```

추후:

```text
REVERSING
PWN
```

---

# 문제 파일 Artifact 제공 방식

CTF 문제에 따라 분석용 파일을 제공할 수 있습니다.

예:

```text
challenge.zip
image.jpg
capture.pcap
logs.txt
source.txt
```

문제 상세 페이지에서 다음 형태로 제공합니다.

```text
Challenge Detail
      ↓
Download Artifact
      ↓
Backend
      ↓
Authorized Challenge File
```

Client가 실제 서버 파일 경로를 직접 알고 접근하는 방식은 사용하지 않습니다.

권장 API:

```text
GET /api/challenges/{challenge_id}/artifact
```

Backend에서는 다음을 검사합니다.

* Challenge 존재 여부
* Challenge 공개 여부
* 등록된 Artifact 존재 여부
* 허용된 파일인지
* 안전한 저장 경로인지

사용자가 임의의 파일 경로를 지정할 수 없도록 설계합니다.

---

# 프로젝트 구조

```text
mini-ctf-platform/
│
├── backend/
│   ├── build.gradle
│   ├── src/main/java/com/example/minictf/
│   │   ├── MiniCtfApplication.java
│   │   ├── config/
│   │   ├── models/
│   │   ├── controller/
│   │   ├── repository/
│   │   ├── service/
│   │   ├── security/
│   │   └── exception/
│   └── src/main/resources/db/migration/
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── hooks/
│   │   └── types/
│   └── public/
│
├── challenges/
│   ├── web/
│   ├── crypto/
│   ├── forensics/
│   └── misc/
│
├── docs/
├── tests/
├── AGENTS.md
├── DESIGN.md
└── README.md
```

---

# Database

## User

```text
id
username
nickname
password_hash
role
score
created_at
```

## Challenge

```text
id
title
description
category
difficulty
score
flag_hash
artifact_path
is_active
created_at
updated_at
```

## Submission

```text
id
user_id
challenge_id
is_correct
submitted_at
```

## Solve

```text
id
user_id
challenge_id
solved_at
```

---

# API

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/oauth/{provider}/authorize
GET  /api/auth/oauth/{provider}/callback
GET  /api/auth/me
```

`provider`는 초기에는 `google`을 사용하고, 이후 `github`, `kakao`, `naver`를 추가할 수 있다. OAuth Client Secret, Redirect URI, JWT Secret은 환경 변수로 관리하며 Provider Token을 일반 API 응답에 노출하지 않는다.

## Challenges

```text
GET  /api/challenges
GET  /api/challenges/{id}
GET  /api/challenges/{id}/artifact
POST /api/challenges/{id}/submit
```

## Ranking

```text
GET /api/ranking
```

## User

```text
GET /api/users/me
GET /api/users/me/solves
GET /api/users/me/submissions
```

## Admin

```text
POST   /api/admin/challenges
PUT    /api/admin/challenges/{id}
DELETE /api/admin/challenges/{id}
```

---

# API 응답 포맷

가능한 한 API 응답 형식을 통일합니다.

## Success

일반 성공 응답:

```json
{
  "success": true,
  "data": {
  }
}
```

예:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "Hidden Message",
    "category": "WEB",
    "difficulty": "EASY",
    "score": 100
  }
}
```

목록:

```json
{
  "success": true,
  "data": [
  ]
}
```

---

# API 오류 응답

오류 응답은 다음 구조를 기본으로 합니다.

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 표시할 메시지"
  }
}
```

예:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FLAG",
    "message": "FLAG가 올바르지 않습니다."
  }
}
```

서버 Stack Trace나 DB 내부 오류는 API 응답에 포함하지 않습니다.

---

# HTTP 상태 코드 기준

## 200 OK

정상 조회 또는 정상 처리.

예:

```text
GET /api/challenges
GET /api/ranking
```

---

## 201 Created

새로운 Resource 생성.

예:

```text
회원가입
Challenge 등록
```

---

## 204 No Content

성공적으로 삭제했으며 응답 Body가 필요하지 않은 경우.

---

## 400 Bad Request

요청 형식이 잘못되었거나 일반적인 Validation 실패.

---

## 401 Unauthorized

로그인이 필요하거나 인증 Token이 유효하지 않은 경우.

---

## 403 Forbidden

로그인은 되어 있지만 권한이 없는 경우.

예:

```text
일반 사용자 → Admin API 접근
```

---

## 404 Not Found

Resource가 존재하지 않는 경우.

예:

```text
존재하지 않는 Challenge
```

---

## 409 Conflict

이미 존재하는 Resource 또는 중복 상태.

예:

```text
이미 존재하는 Username
```

---

## 422 Unprocessable Entity

Spring Boot Bean Validation 기준을 만족하지 않는 입력.

---

## 429 Too Many Requests

Rate Limit 초과.

예:

```text
FLAG 과도한 제출
로그인 과도한 요청
```

---

## 500 Internal Server Error

예상하지 못한 서버 오류.

상세 내부 정보는 Client에 노출하지 않습니다.

---

# FLAG 제출 응답 예시

## Correct

```json
{
  "success": true,
  "data": {
    "result": "correct",
    "awarded_score": 100
  }
}
```

## Incorrect

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FLAG",
    "message": "FLAG가 올바르지 않습니다."
  }
}
```

## Already Solved

```json
{
  "success": true,
  "data": {
    "result": "already_solved",
    "awarded_score": 0
  }
}
```

## Rate Limited

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요."
  }
}
```

HTTP:

```text
429 Too Many Requests
```

---

# 보안 설계

플랫폼 자체는 안전하게 구현합니다.

주요 보안 항목:

* Password Hash
* Backend FLAG Validation
* FLAG Hash 저장
* SQL Injection 방어
* 서식 텍스트 및 스크립트 주입 방어
* Authentication
* Authorization
* IDOR 방어
* FLAG Submit Rate Limiting
* 로그인 Rate Limiting
* Secret 관리
* 안전한 Artifact 제공
* 중복 점수 방지
* Race Condition 방지
* 입력값 검증
* API 요청 출처 및 TLS 정책
* Security Logging

---

# Quick Start

## 1. Repository Clone

```bash
git clone <repository-url>
cd mini-ctf-platform
```

---

## 2. Backend Dependency 설치

JDK 21과 Gradle 또는 Maven을 준비합니다.

```bash
cd backend
./gradlew build
```

Windows에서는 `gradlew.bat build`를 사용합니다.

---

## 3. Frontend Dependency 설치

```bash
cd frontend
npm install
```

---

## 4. 환경 변수 준비

`.env.example`이 있다면 복사합니다.

Windows:

```bash
copy .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

예:

```env
SECRET_KEY=change-this-secret
DATABASE_URL=postgres://mini_ctf:change-this-secret@127.0.0.1:5432/mini_ctf
```

실제 Secret은 GitHub에 Commit하지 않습니다.

---

## 5. Backend 실행

프로젝트 구조에 따라 Backend 디렉터리에서 실행합니다.

```bash
cd backend
./gradlew bootRun
```

기본 주소 예:

```text
http://127.0.0.1:8080
```

REST API 문서:

```text
http://127.0.0.1:8080/v3/api-docs
```

---

## 6. Frontend 실행

```bash
cd frontend
npm run dev
```

기본 주소 예:

```text
http://localhost:5173
```

Client는 TLS가 적용된 API 주소만 사용하며, 서버 주소와 인증서 정책은 환경 설정으로 관리합니다.

---

## 7. 실행 확인

다음 순서로 확인합니다.

```text
Register
↓
Login
↓
Challenges
↓
Challenge Detail
↓
FLAG Submit
↓
Ranking
↓
My Page
```

---

# 개발 계획

## Week 1

* Project Structure
* Java / Spring Boot REST API
* Database
* 회원가입
* 로그인
* Google OAuth 로그인
* 기본 React/TypeScript Client

## Week 2

* Challenge 목록
* Challenge 상세
* Artifact
* FLAG 검증
* Rate Limiting
* Solve
* Score

## Week 3

* Ranking
* My Page
* Admin
* Client / Backend 통합
* Challenge 제작

## Week 4

* UI 개선
* 예외 처리
* 보안 점검
* 문제 추가
* 테스트
* README
* 발표자료
* 시연

---

# MVP 완료 기준

```text
회원가입             ✓
로그인               ✓
Google 로그인        계획
Challenge 조회       ✓
Challenge Detail     ✓
Artifact Download    ✓
FLAG Submit          ✓
FLAG Validation      ✓
FLAG Rate Limit      ✓
Score                ✓
Ranking              ✓
My Page              ✓
Admin Challenge CRUD ✓
```

---

# 최종 시연

```text
1. 회원가입
2. 로그인
3. Google 또는 다른 OAuth Provider 로그인
4. Challenge 목록 확인
5. 문제 선택
6. Artifact 다운로드
7. 문제 풀이
8. FLAG 제출
9. 정답 확인
10. 점수 상승
11. Ranking 변경
12. My Page Solve 확인
```

---

# Challenge Discussion

각 CTF 문제에는 사용자들이 문제에 대해 이야기할 수 있는 Discussion 기능을 제공합니다.

Discussion은 두 가지 영역으로 구분됩니다.

## General Discussion

문제를 해결하지 않은 사용자도 이용할 수 있습니다.

주로 다음 내용을 다룹니다.

- 문제 설명 질문
- Artifact 관련 문제
- 문제 오류 제보
- 환경 관련 질문
- 스포일러 없는 일반 질문

직접적인 FLAG나 문제 정답, 풀이 방법 등의 스포일러는 작성하지 않는 것을 원칙으로 합니다.

## Solver Discussion

해당 Challenge를 해결한 사용자만 이용할 수 있는 풀이 토론 공간입니다.

```text
Challenge
   ↓
FLAG Correct
   ↓
Solve 기록 생성
   ↓
Solver Discussion 접근 가능
```

Solver Discussion에서는 다음 내용을 공유할 수 있습니다.

- 문제 풀이 아이디어
- 접근 방법
- 사용한 도구
- 풀이 후기
- 추가 학습 내용

Solver Discussion 접근 권한은 Client가 아닌 Backend에서 Solve 기록을 기반으로 검증합니다.

---

# Community

Mini-CTF에는 사용자들이 정보보안과 CTF 관련 정보를 공유할 수 있는 전용 Community가 포함됩니다.

Navigation:

```text
Home
Challenges
Community
Ranking
My Page
```

초기 게시판 Category:

| Category | 설명 |
|---|---|
| FREE | 자유게시판 |
| QUESTION | 보안 및 CTF 관련 질문 |
| CTF | CTF 정보 및 학습 내용 공유 |
| NOTICE | 운영자 공지 |

`NOTICE` 게시글은 관리자만 작성할 수 있습니다.

---

# Community 주요 기능

게시글 기능:

- 게시글 목록
- 게시글 상세
- 게시글 작성
- 본인 게시글 수정
- 본인 게시글 삭제

댓글 기능:

- 댓글 작성
- 댓글 조회
- 본인 댓글 수정
- 본인 댓글 삭제

관리자는 운영상 필요한 경우 게시글과 댓글을 관리할 수 있습니다.

---

# Community Database

## ChallengeComment

```text
id
challenge_id
user_id
content
discussion_type
created_at
updated_at
```

Discussion Type:

```text
GENERAL
SOLVER
```

## Post

```text
id
user_id
title
content
category
view_count
created_at
updated_at
```

## PostComment

```text
id
post_id
user_id
content
created_at
updated_at
```

---

# Community API

## Challenge Discussion

```text
GET    /api/challenges/{challenge_id}/comments
POST   /api/challenges/{challenge_id}/comments
PUT    /api/challenges/{challenge_id}/comments/{comment_id}
DELETE /api/challenges/{challenge_id}/comments/{comment_id}
```

## Community Posts

```text
GET    /api/community/posts
POST   /api/community/posts
GET    /api/community/posts/{post_id}
PUT    /api/community/posts/{post_id}
DELETE /api/community/posts/{post_id}
```

## Community Comments

```text
GET    /api/community/posts/{post_id}/comments
POST   /api/community/posts/{post_id}/comments
PUT    /api/community/comments/{comment_id}
DELETE /api/community/comments/{comment_id}
```

---

# Community Security

사용자 입력이 저장되는 Community 기능은 다음 보안 요소를 중요하게 고려합니다.

- Stored XSS 방어
- 입력값 Validation
- 작성자 권한 확인
- IDOR 방어
- 게시글 Rate Limiting
- 댓글 Rate Limiting
- Solver Discussion 접근 제어
- 관리자 권한 검증

게시글 또는 댓글의 ID만 변경해 다른 사용자의 콘텐츠를 수정하거나 삭제할 수 없어야 합니다.

Solver Discussion은 해당 Challenge를 해결한 사용자에게만 Backend에서 전달합니다.

---

# 확장된 서비스 구조

```text
Mini-CTF
│
├── Home
│
├── Challenges
│   └── Challenge Detail
│       ├── Description
│       ├── Artifact
│       ├── FLAG Submit
│       └── Discussion
│           ├── General
│           └── Solver Discussion
│
├── Community
│   ├── Free
│   ├── Question
│   ├── CTF
│   └── Notice
│
├── Ranking
│
└── My Page
```

---

# Community 개발 순서

Community 기능은 CTF 핵심 기능이 완료된 이후 개발합니다.

```text
CTF MVP
   ↓
Challenge Discussion
   ↓
Solver Discussion
   ↓
Community Posts
   ↓
Community Comments
   ↓
Security Testing
   ↓
Pagination / Search
```

Community 기능의 개수를 늘리는 것보다 CTF 문제 풀이 기능과 Community가 안정적이고 안전하게 연결되도록 만드는 것을 우선합니다.
---

# 프로젝트 방향

핵심 사용자 경험:

> **회원가입 → 로그인 → 문제 선택 → Artifact 분석 → FLAG 제출 → 점수 → Ranking**

그리고 이 전체 흐름이 **안전하게 동작하는 것**이 프로젝트의 가장 중요한 목표입니다.
