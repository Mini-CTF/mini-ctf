# AGENTS.md — Mini CTF Platform 개발 지침

## 1. 프로젝트 개요

이 프로젝트는 고등학생 2인이 약 한 달 동안 개발하는 **웹 기반 미니 CTF(Capture The Flag) 보안 학습 플랫폼**이다.

Dreamhack과 같은 보안 학습 플랫폼에서 아이디어를 얻되, 대규모 서비스가 아닌 한 달 안에 완성 가능한 미니 플랫폼을 목표로 한다.

사용자는 회원가입 및 로그인 후 다양한 분야의 CTF 문제를 확인하고 문제를 풀어 FLAG를 제출할 수 있다.

정답을 맞히면 점수를 획득하며 획득한 점수를 기반으로 랭킹이 계산된다.

프로젝트의 핵심 목적은 다음과 같다.

* 웹 개발 역량 향상
* Java 21 / Spring Boot 활용
* React / TypeScript 웹 클라이언트 활용
* REST API 설계 경험
* 데이터베이스 설계 경험
* 사용자 인증 및 권한 관리 경험
* 보안 문제 제작 경험
* 안전한 FLAG 검증 구조 구현
* 웹 애플리케이션 보안 적용
* Git/GitHub 협업 경험
* 실제 서비스 형태의 결과물 제작

---

# 2. 핵심 개발 원칙

이 프로젝트는 **보안을 주제로 하는 웹사이트인 동시에 플랫폼 자체도 안전해야 한다.**

개발 우선순위는 다음과 같다.

```text
1. Security
2. Correctness
3. Core Functionality
4. Maintainability
5. UI/UX
6. Additional Features
```

기능을 추가하기 위해 기존 보안을 약화시키지 않는다.

메인 CTF 플랫폼 자체를 의도적으로 취약하게 만들지 않는다.

---

# 3. Codex 기본 행동 지침

Codex는 프로젝트를 수정하거나 기능을 구현하기 전에 다음 순서를 따른다.

1. 현재 프로젝트 구조를 확인한다.
2. `AGENTS.md`, `README.md`, `DESIGN.md`를 모두 읽는다.
3. 기존 코드와 충돌 여부를 확인한다.
4. 필요한 최소 범위만 수정한다.
5. 기존 기능을 불필요하게 다시 작성하지 않는다.
6. 보안에 영향을 주는 변경은 특히 신중하게 구현한다.
7. Backend 입력 검증을 Client 검증보다 우선한다.
8. 인증과 권한 검사를 Backend에서 수행한다.
9. 구현 후 관련 기능을 테스트한다.
10. 변경 사항을 간단히 설명한다.

코드는 고등학생 개발자가 읽고 이해할 수 있는 수준으로 작성한다.

과도한 추상화와 복잡한 디자인 패턴은 피한다.

---

# 4. 기술 스택

## Backend

* Java 21
* Spring Boot 3
* Spring Web MVC
* Spring Data JPA
* Bean Validation
* Flyway (기존 DB 스키마 관리가 필요할 때)
* JWT Authentication
* Argon2 기반 Password Hash

## Database

* PostgreSQL

## Client

* React
* TypeScript
* Vite
* React Router
* TanStack Query 또는 동등한 서버 상태 관리

클라이언트는 REST API를 호출하는 React 웹 애플리케이션으로 한정한다. 같은 업무 API를 FastAPI로 중복 구현하지 않는다.

## Development

* VS Code
* Git
* GitHub

## AI 개발 도구

* Codex
* Cursor

개발과 코드 리뷰에는 VS Code를 기본 편집기로 사용하고, Codex와 Cursor를 보조 AI 개발 도구로 사용한다. AI가 생성하거나 수정한 코드는 보안 요구사항, DB 변경 여부, 테스트 결과를 개발자가 직접 검토한다. Secret, 비밀번호, FLAG 원문은 AI 프롬프트와 저장소에 포함하지 않는다.

## FastAPI 사용 판단

핵심 업무 API는 인증, 권한, FLAG 검증, 점수, Rate Limit, DB 트랜잭션의 일관성이 중요하므로 Java Spring Boot가 단일 공개 REST API 서버를 담당한다.

FastAPI가 필요하다면 문제 실행기나 파일 분석기처럼 별도로 격리된 내부 서비스로만 사용한다. FastAPI는 공개 API, 사용자 인증, 점수 계산, Solve 생성, DB 스키마의 소유자가 되지 않으며 Spring Boot가 내부 호출을 통제한다.

즉, 기본 MVP는 `Spring Boot REST API + React/TypeScript + 기존 PostgreSQL`로 구현하고, FastAPI는 실제 요구가 생길 때 추가한다.

---

# 5. 주요 기능

## 회원가입

필수 입력:

* username
* password
* password confirmation

선택:

* nickname

비밀번호는 절대 평문으로 저장하지 않는다.

소셜 로그인:

* Google OAuth 2.0 / OpenID Connect를 1차 제공자로 지원한다.
* GitHub, Kakao, Naver 로그인을 확장 제공자로 고려한다.
* 소셜 로그인 성공 후에도 Backend가 기존 사용자 계정과 연결하고 동일한 JWT를 발급한다.
* Provider access token과 refresh token은 필요하지 않으면 저장하지 않는다.

OAuth 계정 연동 정보는 기존 사용자 정보와 분리해서 관리하며, 기존 DB의 User·Challenge·Submission·Solve 구조와 API 동작을 임의로 변경하지 않는다. 실제 구현 시 provider와 provider의 고유 subject를 기준으로 계정을 식별한다.

---

## 로그인

로그인 성공 후 인증 정보를 발급한다.

비로그인:

```text
Home
Challenges
Ranking
Login
Register
```

로그인:

```text
Home
Challenges
Ranking
My Page
Logout
```

관리자:

```text
Home
Challenges
Ranking
My Page
Admin
Logout
```

---

# 6. CTF Challenge

각 문제는 최소 다음 정보를 가진다.

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

카테고리:

```text
WEB
CRYPTO
FORENSICS
MISC
```

확장 가능:

```text
REVERSING
PWN
```

난이도:

```text
EASY
MEDIUM
HARD
```

---

# 7. FLAG 제출

사용자는 문제 상세 페이지에서 FLAG를 제출한다.

예:

```text
CTF{example_flag}
```

검증은 반드시 Backend에서 수행한다.

금지:

```java
boolean isCorrect = passwordEncoder.matches(
    submittedFlag,
    challenge.getFlagHash()
);
```

올바른 구조:

```text
React + TypeScript Client
   ↓
POST /api/challenges/{id}/submit
   ↓
Spring Boot REST API
   ↓
FLAG Hash 비교
   ↓
Correct / Incorrect
```

FLAG 원문을 Client 바이너리, Client 리소스 또는 일반 API 응답에 노출하지 않는다.

가능하면 DB에는 `flag_hash`만 저장한다.

---

# 8. FLAG 제출 횟수 제한 — Rate Limiting

FLAG 제출 API에는 반드시 Rate Limiting을 고려한다.

보호 대상:

```text
POST /api/challenges/{challenge_id}/submit
```

목적:

* FLAG 무차별 대입 방지
* 서버 부하 방지
* 자동화된 FLAG 추측 방지
* API Abuse 방지

초기 기준 예시:

```text
동일 사용자:
10초 동안 최대 5회

또는

1분 동안 최대 20회
```

실제 값은 테스트를 통해 조정할 수 있다.

Rate Limit은 가능하면 다음 요소를 함께 고려한다.

```text
user_id
+
source IP
+
challenge_id
```

Rate Limit을 초과하면:

```http
429 Too Many Requests
```

를 반환한다.

예시 응답:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "너무 많은 FLAG 제출 요청이 발생했습니다. 잠시 후 다시 시도해주세요."
  }
}
```

가능하면 `Retry-After` Header를 제공한다.

Client에서는 사용자에게 남은 제한 시간을 지나치게 정밀하게 보여줄 필요는 없다.

Rate Limit 상태는 서버에서 관리하며 Client 로직만으로 구현하지 않는다.

---

# 9. 중복 정답 방지

한 사용자가 동일 문제를 여러 번 해결해도 점수를 한 번만 받는다.

```text
첫 정답
→ Solve 생성
→ 점수 지급

이미 해결한 문제
→ Solve 생성 X
→ 추가 점수 X
```

DB에서:

```text
user_id + challenge_id
```

조합을 Unique Constraint로 설정한다.

---

# 10. Race Condition 방지

동일 FLAG를 빠르게 여러 번 제출해도 점수가 중복 지급되지 않아야 한다.

가능하면 다음 처리를 하나의 Database Transaction으로 묶는다.

```text
FLAG 검증
↓
Solve 존재 확인
↓
Solve 생성
↓
점수 반영
```

---

# 11. 점수 시스템

문제마다 서버에서 점수를 관리한다.

예:

```text
EASY     100
MEDIUM   200
HARD     300
```

Client가 점수를 지정해서 보내지 않는다.

금지:

```json
{
  "challenge_id": 1,
  "score": 999999
}
```

점수는 Backend가 Challenge 데이터를 기준으로 결정한다.

---

# 12. 문제 파일 Artifact

일부 CTF 문제는 별도의 분석 파일을 제공할 수 있다.

예:

```text
image.jpg
capture.pcap
challenge.zip
log.txt
source.txt
binary_sample
```

문제 파일은 `challenges/` 또는 별도의 안전한 Artifact Storage에 저장한다.

예:

```text
challenges/
├── crypto/
├── forensics/
├── web/
└── misc/
```

사용자는 서버가 지정한 Artifact만 다운로드할 수 있어야 한다.

사용자가 직접 파일 경로를 전달하여 접근하는 구조를 피한다.

금지:

```text
/download?path=../../../../secret
```

권장:

```text
GET /api/challenges/{challenge_id}/artifact
```

Backend에서 다음을 확인한다.

* 문제 존재 여부
* 공개 상태
* 허용된 파일인지
* 안전한 실제 경로인지

Path Traversal 방지를 반드시 고려한다.

---

# 13. Ranking

최소 표시 정보:

* Rank
* Username / Nickname
* Score
* Solved Count

기본 정렬:

```text
score DESC
```

동점 처리 기준은 추후 확장 가능하다.

---

# 14. My Page

사용자에게 다음을 제공한다.

* username
* nickname
* score
* rank
* solved count
* solved challenges
* recent submissions

다른 사용자의 민감한 제출 기록은 열람할 수 없어야 한다.

---

# 15. 관리자

관리자 기능:

* 문제 등록
* 문제 수정
* 문제 삭제
* 문제 공개/비공개
* 문제 Artifact 관리

선택:

* 사용자 조회
* Submission 조회

관리자 API는 Backend에서 `role`을 검사한다.

일반 사용자가 URL을 직접 호출해도 접근할 수 없어야 한다.

권한 부족:

```http
403 Forbidden
```

---

# 16. 인증 보안

보호된 API는 인증을 요구한다.

인증되지 않은 경우:

```http
401 Unauthorized
```

JWT Payload에는 최소 정보만 포함한다.

예:

```text
user_id
role
expiration
```

포함 금지:

```text
password
password_hash
flag
API key
```

OAuth 보안 요구사항:

* Authorization Code Flow와 PKCE를 사용한다.
* `state`와 `nonce`를 검증해 CSRF와 Replay를 방지한다.
* OAuth Redirect URI는 등록된 HTTPS 주소만 허용한다.
* Provider가 반환한 이메일은 검증된 이메일인지 확인한다.
* 이메일 주소만으로 기존 계정을 자동 연결하지 않고 명시적인 계정 연결 절차를 둔다.
* OAuth 성공·실패 결과를 확인한 뒤 Backend에서만 자체 JWT를 발급한다.

---

# 17. Secret 관리

다음 정보는 코드에 Hard Coding하지 않는다.

* JWT Secret
* API Key
* Database Password
* 관리자 초기 비밀번호
* 외부 Token

`.env` 등을 이용한다.

`.gitignore`:

```text
.env
target/
build/
*.pdb
```

필요하면 `.env.example`을 제공한다.

---

# 18. SQL Injection 방어

SQL Query에 사용자 문자열을 직접 결합하지 않는다.

금지:

```java
Optional<User> user = userRepository.findByUsername(username);
```

Spring Data Repository 또는 JDBC의 바인딩 파라미터를 사용한다. 사용자 입력을 SQL 문자열에 직접 이어 붙이지 않는다.

---

# 19. XSS 방어

사용자 데이터를 서식 있는 텍스트로 직접 해석하지 않는다.

Client에서는 기본적으로 일반 텍스트 위젯을 사용한다.

```tsx
<p>{value}</p>
```

React는 문자열을 기본적으로 텍스트로 렌더링한다. `dangerouslySetInnerHTML`은 사용하지 않으며, Markdown을 지원할 때만 허용 목록 기반 Sanitization을 적용한다.

---

# 20. IDOR 방어

개인 정보 조회는 가능하면 URL의 사용자 ID보다 인증된 Token의 사용자 ID를 기준으로 한다.

권장:

```text
GET /api/users/me
```

일반 사용자가 다른 사용자 ID를 바꾸는 것만으로 민감한 정보를 조회할 수 없어야 한다.

---

# 21. 로그인 Rate Limiting

다음 API 역시 Rate Limit 대상이다.

```text
POST /api/auth/login
POST /api/auth/register
```

짧은 시간 동안 반복적인 인증 실패가 발생하면 일시적으로 제한할 수 있다.

사용자 계정 존재 여부가 노출되지 않도록 한다.

권장 오류:

```text
아이디 또는 비밀번호가 올바르지 않습니다.
```

---

# 22. API 요청 출처 및 전송 보안

개발 편의만을 위해 모든 요청 출처를 허용하거나 평문 전송을 사용하지 않는다.

```text
allowed_origins = []
tls_required = true
```

배포 환경에서는 허용된 API 요청 출처와 TLS 정책만 지정한다.

---

# 23. 파일 보안

문제 파일 제공 시 다음을 고려한다.

* Path Traversal
* MIME Type
* Content-Disposition
* 허용된 파일 목록
* 파일 크기
* 실행 가능한 파일 취급

관리자 업로드 기능을 추가하면:

* 확장자 검증
* 파일 크기 제한
* 파일명 랜덤화
* 실행 디렉터리와 분리

를 적용한다.

---

# 24. 오류 처리

사용자에게 다음 정보를 그대로 보여주지 않는다.

* Stack Trace
* DB 오류
* 서버 파일 경로
* Secret
* SQL Query

사용자 응답은 단순화하고 상세 오류는 서버 로그에 기록한다.

---

# 25. Security Logging

다음 이벤트 기록을 고려한다.

```text
LOGIN_SUCCESS
LOGIN_FAILED
FLAG_CORRECT
FLAG_INCORRECT
FLAG_RATE_LIMITED
ADMIN_CHALLENGE_CREATE
ADMIN_CHALLENGE_UPDATE
ADMIN_CHALLENGE_DELETE
UNAUTHORIZED_ADMIN_ACCESS
```

로그에 저장하면 안 되는 정보:

```text
Password
Password Hash
FLAG 원문
JWT 전체
API Key
```

---

# 26. API 기본 구조

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/oauth/{provider}/authorize
GET  /api/auth/oauth/{provider}/callback
GET  /api/auth/me
```

## Challenges

```text
GET  /api/challenges
GET  /api/challenges/{id}
POST /api/challenges/{id}/submit
GET  /api/challenges/{id}/artifact
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

# 27. CTF 문제 격리

메인 플랫폼 자체를 CTF 문제로 사용하지 않는다.

취약한 웹 Challenge가 필요하면:

```text
Main CTF Platform
        │
        └── Isolated Challenge
                 ↓
              Docker
```

형태의 분리를 우선한다.

---

# 28. Codex가 하지 말아야 할 것

명시적인 요청 없이 다음을 하지 않는다.

* 전체 프로젝트 재작성
* 기술 스택 임의 변경
* 별도 Client 프레임워크 추가
* DB 변경
* FLAG Client 노출
* 인증 제거
* 관리자 권한 검사 제거
* CORS 전체 허용
* Secret Hard Coding
* 메인 플랫폼 의도적 취약화
* Rate Limit 제거
* Client에서 점수 계산
* 불필요한 라이브러리 대량 추가

---

# 29. 개발 우선순위

```text
1. Spring Boot 기본 REST API 서버
2. Database
3. User Model
4. 회원가입
5. 로그인
6. Challenge Model
7. 문제 목록
8. 문제 상세
9. Artifact 다운로드
10. FLAG 제출
11. FLAG Rate Limiting
12. Solve 기록
13. 점수
14. Ranking
15. My Page
16. Admin
17. UI 개선
18. Challenge 제작
19. 보안 테스트
20. 배포
```

---

# 30. 보안 테스트 체크리스트

* [ ] 비로그인 사용자는 My Page API 접근 불가
* [ ] 일반 사용자는 Admin API 접근 불가
* [ ] API Response에 FLAG 없음
* [ ] React 번들과 정적 리소스에 FLAG 없음
* [ ] 비밀번호 평문 저장 없음
* [ ] SQL 문자열 직접 결합 없음
* [ ] 동일 문제 중복 점수 획득 불가
* [ ] 빠른 중복 요청으로 점수 중복 획득 불가
* [ ] FLAG API에 Rate Limit 적용
* [ ] Rate Limit 초과 시 429 반환
* [ ] 다른 사용자의 민감 정보 임의 조회 불가
* [ ] XSS 입력이 실행되지 않음
* [ ] Artifact Path Traversal 불가
* [ ] Secret이 Git에 포함되지 않음
* [ ] Client에서 점수 조작 불가

---

# 31. 최종 목표

다음 사용자 흐름이 안전하게 동작해야 한다.

```text
회원가입
   ↓
로그인
   ↓
Challenge 조회
   ↓
Artifact 다운로드
   ↓
문제 풀이
   ↓
FLAG 제출
   ↓
Rate Limit 검사
   ↓
FLAG 검증
   ↓
Solve 생성
   ↓
점수 반영
   ↓
Ranking
   ↓
My Page
```

---

# Community & Challenge Discussion Requirements

## 1. 커뮤니티 기능 개요

Mini-CTF는 단순한 CTF 문제 풀이 플랫폼을 넘어 사용자들이 정보보안과 CTF에 대해 질문하고 정보를 공유할 수 있는 커뮤니티 기능을 제공한다.

Community 기능은 CTF 핵심 기능이 안정적으로 완성된 이후 구현한다.

개발 우선순위:

```text
1. CTF 핵심 기능
2. Challenge Discussion
3. Community
4. Community 추가 기능
```

Community 기능 추가로 인해 기존 CTF 기능의 보안이나 안정성이 저하되어서는 안 된다.

---

## 2. Challenge Discussion

각 Challenge Detail 페이지에는 해당 문제에 대한 Discussion 기능을 제공한다.

Discussion은 다음 두 영역으로 나눈다.

### General Discussion

문제를 아직 해결하지 않은 사용자도 읽고 작성할 수 있다.

사용 목적:

- 문제 설명 관련 질문
- Artifact 다운로드 문제
- 문제 오류 제보
- 문제 환경 관련 질문
- 스포일러가 포함되지 않은 일반적인 질문

General Discussion에는 FLAG, 정답, 직접적인 풀이 방법 등 명확한 스포일러를 작성하지 않는 것을 원칙으로 한다.

### Solver Discussion

해당 Challenge를 해결한 사용자만 읽고 작성할 수 있다.

Solver Discussion에서는 다음 내용을 공유할 수 있다.

- 풀이 아이디어
- 접근 방법
- 사용한 도구
- 풀이 후기
- 추가 학습 내용

Solver Discussion 접근 권한은 반드시 Backend에서 Solve 기록을 확인하여 결정한다.

Client에서 UI만 숨기는 방식으로 접근을 제한하지 않는다.

---

## 3. Challenge Comment 데이터 구조

권장 구조:

```text
challenge_comments

id
challenge_id
user_id
content
discussion_type
created_at
updated_at
```

`discussion_type` 값:

```text
GENERAL
SOLVER
```

댓글 작성자의 `user_id`는 인증 정보를 기반으로 Backend가 결정한다.

Client가 임의의 `user_id`를 전달해 작성자를 지정할 수 없도록 한다.

---

## 4. Community

Navigation에 Community 메뉴를 추가한다.

```text
Home
Challenges
Community
Ranking
My Page
```

초기 Community Category:

```text
FREE
QUESTION
CTF
NOTICE
```

각 Category의 의미:

```text
FREE     자유게시판
QUESTION 보안 / CTF 질문
CTF      CTF 정보 및 학습 내용 공유
NOTICE   운영자 공지
```

`NOTICE` 게시글은 관리자만 작성할 수 있다.

---

## 5. Community Post

권장 데이터 구조:

```text
posts

id
user_id
title
content
category
view_count
created_at
updated_at
```

필수 기능:

- 게시글 목록 조회
- 게시글 상세 조회
- 게시글 작성
- 본인 게시글 수정
- 본인 게시글 삭제

관리자는 운영상 필요한 경우 게시글을 관리할 수 있다.

---

## 6. Community Comment

게시글에는 댓글 기능을 제공한다.

권장 구조:

```text
post_comments

id
post_id
user_id
content
created_at
updated_at
```

필수 기능:

- 댓글 작성
- 댓글 조회
- 본인 댓글 수정
- 본인 댓글 삭제

---

## 7. Community 권한 검증

게시글 및 댓글 수정/삭제 권한은 반드시 Backend에서 검사한다.

사용자가 URL이나 API의 ID만 변경해 다른 사용자의 게시글 또는 댓글을 수정하거나 삭제할 수 없어야 한다.

권한 기준:

```text
현재 로그인 사용자 == 작성자
OR
현재 로그인 사용자 == ADMIN
```

조건을 만족하지 않으면:

```http
403 Forbidden
```

을 반환한다.

---

## 8. Stored XSS 방어

Community와 Challenge Discussion은 사용자 입력을 DB에 저장하기 때문에 Stored XSS 방어를 중요하게 고려한다.

다음 입력값을 신뢰하지 않는다.

- 게시글 제목
- 게시글 내용
- Challenge 댓글
- Community 댓글
- nickname

React에서는 사용자 콘텐츠를 출력할 때 문자열 렌더링을 사용하고 HTML 해석을 기본값으로 두지 않는다.

```tsx
<p>{content}</p>
```

사용자가 다음과 같은 스크립트 문자열을 입력하더라도 실행되지 않고 일반 텍스트로 표시되어야 한다.

```text
[script] alert(1) [/script]
```

Markdown 또는 서식 있는 텍스트 렌더링 기능을 제공할 경우 반드시 허용 목록 기반 Sanitization 과정을 적용한다.

---

## 9. 게시글 및 댓글 Rate Limiting

자동화된 도배와 API Abuse를 방지하기 위해 Community 관련 작성 API에 Rate Limiting을 적용한다.

대상 예시:

```text
POST /api/community/posts
POST /api/community/posts/{post_id}/comments
POST /api/challenges/{challenge_id}/comments
```

Rate Limit 초과 시:

```http
429 Too Many Requests
```

를 반환한다.

실제 Rate Limit 값은 테스트 후 결정한다.

Rate Limit은 Client가 아닌 Backend에서 적용한다.

---

## 10. 입력값 Validation

모든 Community 입력값은 Backend에서 다시 검증한다.

게시글:

```text
title
content
category
```

댓글:

```text
content
discussion_type
```

검증 항목:

- 최소 길이
- 최대 길이
- 빈 문자열 여부
- 허용된 Category
- 허용된 Discussion Type

Client Validation만 신뢰하지 않는다.

---

## 11. Solver Discussion 스포일러 보호

Solver Discussion의 내용은 문제를 해결하지 않은 사용자에게 API Response 자체가 전달되지 않아야 한다.

잘못된 구조:

```text
Backend에서 Solver 댓글 전달
↓
Client에서 숨김
```

올바른 구조:

```text
Request
↓
Authentication
↓
Solve 여부 확인
↓
해결한 사용자만 Solver 댓글 반환
```

---

## 12. Community API

### Challenge Discussion

```text
GET    /api/challenges/{challenge_id}/comments
POST   /api/challenges/{challenge_id}/comments
PUT    /api/challenges/{challenge_id}/comments/{comment_id}
DELETE /api/challenges/{challenge_id}/comments/{comment_id}
```

Solver Discussion 요청은 Backend에서 반드시 Solve 여부를 검사한다.

### Community Posts

```text
GET    /api/community/posts
POST   /api/community/posts
GET    /api/community/posts/{post_id}
PUT    /api/community/posts/{post_id}
DELETE /api/community/posts/{post_id}
```

### Community Comments

```text
GET    /api/community/posts/{post_id}/comments
POST   /api/community/posts/{post_id}/comments
PUT    /api/community/comments/{comment_id}
DELETE /api/community/comments/{comment_id}
```

---

## 13. Community Security Logging

필요한 경우 다음 이벤트를 서버 로그에 기록한다.

```text
COMMUNITY_POST_CREATE
COMMUNITY_POST_UPDATE
COMMUNITY_POST_DELETE
COMMUNITY_COMMENT_CREATE
COMMUNITY_COMMENT_DELETE
CHALLENGE_COMMENT_CREATE
CHALLENGE_COMMENT_DELETE
COMMUNITY_RATE_LIMITED
```

다음 정보는 로그에 저장하지 않는다.

- 비밀번호
- JWT 전체 값
- FLAG 원문
- Secret Key
- API Key

게시글이나 댓글 전체 내용을 보안 로그에 불필요하게 복제하지 않는다.

---

## 14. 구현 우선순위

Community 관련 기능은 다음 순서로 구현한다.

```text
1. CTF MVP 완성
2. General Challenge Discussion
3. Solver Discussion + Solve 권한 확인
4. Community Post CRUD
5. Community Comment CRUD
6. Stored XSS 방어 확인
7. Community Rate Limiting
8. Pagination
9. Search
10. 신고 / 좋아요 등의 선택 기능
```

검색, 좋아요, 신고 등의 기능은 초기 Community MVP의 필수 요소가 아니다.

이 프로젝트는 단순한 CTF 사이트가 아니라,

> **보안 원칙을 실제 웹 개발 과정에 적용한 안전한 CTF 학습 플랫폼**

을 목표로 한다.
