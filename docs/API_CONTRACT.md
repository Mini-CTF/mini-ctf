# FlagBox REST API 계약

Base URL: `/api`
성공 응답은 `{ "success": true, "data": ... }`, 오류 응답은
`{ "success": false, "error": { "code", "message" } }` 형식이다.

인증이 필요한 요청은 `Authorization: Bearer <JWT>` 헤더를 사용한다.

## 주요 공개 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/stats` | 플랫폼 통계 |
| GET | `/challenges` | 문제 목록 |
| GET | `/challenges/{id}` | 문제 상세 |
| GET | `/ranking` | 점수 랭킹 |
| GET | `/attendance/ranking` | 출석 랭킹 |
| GET | `/community/posts` | 게시글 목록 |
| GET | `/community/posts/{id}` | 게시글 상세 |
| GET | `/learning/*` | 학습 허브 데이터 |

## 인증과 사용자 API

| Method | Path | 설명 |
|---|---|---|
| POST | `/auth/register` | 일반 회원가입 |
| POST | `/auth/login` | 일반 로그인 |
| GET | `/auth/me` | 현재 사용자 |
| GET | `/auth/oauth/providers` | 설정된 OAuth 공급자 |
| GET | `/auth/oauth/{provider}/authorize` | OAuth 로그인 시작 |
| GET | `/users/me` | 내 프로필 조회 |
| PUT | `/users/me/profile` | 내 프로필 수정 |
| GET | `/users/{username}/profile` | 공개 프로필 |
| POST | `/users/me/avatar` | 아바타 업로드 |

## 문제·출석 API

| Method | Path | 설명 |
|---|---|---|
| POST | `/challenges/{id}/submit` | FLAG 제출 |
| POST | `/challenges/{id}/hint` | 무료 힌트 조회 |
| GET | `/challenges/{id}/artifact` | 인증된 Artifact 다운로드 |
| POST | `/challenges/{id}/activity` | 문제 활동 기록 |
| GET | `/attendance` | 내 출석 요약 |
| POST | `/attendance/check-in` | 한국 시간 기준 출석 체크 |

## 커뮤니티·소셜 API

| Method | Path | 설명 |
|---|---|---|
| POST/PUT/DELETE | `/community/posts` | 게시글 생성/수정/삭제 |
| GET/POST | `/community/posts/{id}/comments` | 댓글 조회/작성 |
| PATCH | `/community/posts/{id}/reaction` | 반응 추가/변경 |
| GET/POST | `/social/friends/*` | 친구 요청·수락·삭제 |
| GET/POST | `/social/messages/*` | 친구 간 DM |

## 관리자 API

`/admin/*`은 `ADMIN`, `/moderation/*`은 `ADMIN` 또는 `MODERATOR` 권한이 필요하다.
문제 CRUD, 계정 상태·점수 관리, 공지 작성, 콘텐츠 관리, 보안/감사 로그 조회를 제공한다.

## 보안 규칙

- FLAG와 비밀번호 해시는 응답에 노출하지 않는다.
- 입력 검증 실패는 `422`, 인증 실패는 `401`, 권한 부족은 `403`을 사용한다.
- 일부 쓰기 API에는 Rate Limit을 적용한다.
- 상점·루비·꾸미기·유료 힌트 관련 API는 제공하지 않는다.
