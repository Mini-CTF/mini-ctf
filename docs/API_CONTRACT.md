# Mini CTF REST API 계약

기준일: 2026-08-21  
Base URL: `http://localhost:8080/api`

## 공통 규칙

- 성공: `{ "success": true, "data": ... }`
- 오류: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- 보호 API: `Authorization: Bearer <JWT>`
- 날짜/시간: UTC ISO-8601 문자열
- Validation: `422 VALIDATION_FAILED`
- Rate Limit: `429 RATE_LIMITED`와 `Retry-After`
- 사용자 콘텐츠는 HTML이 아닌 일반 문자열로 렌더링한다.

## 인증

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| POST | `/auth/register` | 아니요 | 회원가입, `201` |
| POST | `/auth/login` | 아니요 | 로그인 |
| GET | `/auth/me` | 필요 | 현재 JWT 사용자 |
| GET | `/auth/oauth/providers` | 아니요 | 설정된 Provider 목록 |
| GET | `/auth/oauth/{provider}/authorize` | 아니요 | OAuth 시작 Redirect |

회원가입 Body:

```json
{"username":"student_01","nickname":"Student","password":"strong-password","passwordConfirmation":"strong-password"}
```

로그인 성공의 `data`는 `{ "token": "...", "user": User }`다. 중복 username은 `409 USERNAME_EXISTS`, 잘못된 로그인은 `401 INVALID_CREDENTIALS`다. OAuth JWT는 Redirect URL의 fragment(`#token=...`)로 전달한다.

## 공개 조회

| Method | Path | 설명 |
|---|---|---|
| GET | `/stats` | 활성 문제·전체 Solve·전체 사용자 수 |
| GET | `/challenges` | 활성 문제 목록 |
| GET | `/challenges/{id}` | 활성 문제 상세 |
| GET | `/ranking` | 상위 100명 랭킹 |

로그인 상태로 Challenge를 조회하면 `solved`가 실제 Solve 기록에 맞게 계산된다.

```ts
type ChallengeSummary = {
  id: number
  title: string
  category: string
  difficulty: string
  score: number
  solved: boolean
  artifactAvailable: boolean
}
type ChallengeDetail = ChallengeSummary & { description: string }
type RankingRow = { rank: number; username: string; nickname: string; score: number; solvedCount: number }
```

동점자는 같은 `rank`를 사용하며 다음 순위는 건너뛰는 competition ranking 방식이다.

## FLAG와 Artifact

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| POST | `/challenges/{id}/submit` | 필요 | FLAG 제출 |
| GET | `/challenges/{id}/artifact` | 필요 | Artifact 다운로드 |

FLAG Body는 `{ "flag": "CTF{...}" }`다. 결과는 `correct` 또는 `already_solved`와 `awardedScore`를 포함한다. 오답은 `422 INVALID_FLAG`다. 오답 Submission도 기록되며 동시 정답 요청은 DB 잠금과 Unique Constraint로 점수를 한 번만 지급한다.

## My Page

| Method | Path | 설명 |
|---|---|---|
| GET | `/users/me` | Profile, rank, solvedCount |
| GET | `/users/me/solves` | Solve 목록 |
| GET | `/users/me/submissions` | 최근 Submission 최대 100개 |
| GET | `/users/me/dashboard` | Profile + Solve + 최근 Submission 20개 |

## 관리자 Challenge

모든 경로는 ADMIN 권한이 필요하다.

| Method | Path | 설명 |
|---|---|---|
| GET | `/admin/challenges` | 전체 문제(비활성 포함) |
| GET | `/admin/challenges/{id}` | 관리자 상세 |
| POST | `/admin/challenges` | 문제 생성, `201` |
| PUT | `/admin/challenges/{id}` | 문제 수정 |
| DELETE | `/admin/challenges/{id}` | 기록 보존형 비활성화, `204` |
| POST | `/admin/challenges/{id}/artifact` | multipart part `file` |
| DELETE | `/admin/challenges/{id}/artifact` | 관리 업로드 파일 제거, `204` |

생성·수정 JSON:

```json
{"title":"Hidden Message","description":"문제 설명","category":"WEB","difficulty":"EASY","score":100,"flag":"CTF{admin-input-only}","artifactPath":null,"active":true}
```

`flag`는 생성 시 필수이고 수정 시 `null` 또는 빈 문자열이면 기존 hash를 유지한다. 관리자 응답에도 FLAG 원문과 hash는 포함되지 않는다. 업로드는 최대 25MB이며 `zip`, `jpg`, `jpeg`, `png`, `pcap`, `txt`, `log`, `bin`만 허용한다.

## Challenge Discussion

| Method | Path | 설명 |
|---|---|---|
| GET | `/challenges/{challengeId}/comments?discussionType=GENERAL` | General 목록 |
| GET | `/challenges/{challengeId}/comments?discussionType=SOLVER` | Solver 전용 목록 |
| POST | `/challenges/{challengeId}/comments` | 생성, `201` |
| PUT | `/challenges/{challengeId}/comments/{commentId}` | 작성자/관리자 수정 |
| DELETE | `/challenges/{challengeId}/comments/{commentId}` | 작성자/관리자 삭제, `204` |

생성 Body는 `{ "content": "...", "discussionType": "GENERAL" }`다. Solver 목록과 작성은 Backend가 Solve를 확인하며 미해결 사용자는 `403 FORBIDDEN`이다.

## Community

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| GET | `/community/posts?category=&page=0&size=20` | 아니요 | 게시글 페이지 |
| GET | `/community/posts/{id}` | 아니요 | 상세, 조회 수 증가 |
| POST | `/community/posts` | 필요 | 생성, `201` |
| PUT | `/community/posts/{id}` | 필요 | 작성자/관리자 수정 |
| DELETE | `/community/posts/{id}` | 필요 | 작성자/관리자 삭제, `204` |
| GET | `/community/posts/{postId}/comments` | 아니요 | 댓글 목록 |
| POST | `/community/posts/{postId}/comments` | 필요 | 댓글 생성, `201` |
| PUT | `/community/comments/{id}` | 필요 | 작성자/관리자 수정 |
| DELETE | `/community/comments/{id}` | 필요 | 작성자/관리자 삭제, `204` |

게시글 Body는 `{ "title", "content", "category" }`, category는 `FREE | QUESTION | CTF | NOTICE`다. `NOTICE`는 ADMIN만 작성할 수 있다. 페이지 응답은 `content`, `page`, `size`, `totalElements`, `totalPages`를 포함한다.

## 프론트 연결 체크

- 기존 `RankingRow` 타입에 `rank`를 추가한다.
- 기존 `ChallengeDetail.active` 필드는 공개 상세 응답에 없으므로 제거한다.
- `ChallengeSummary`에 `artifactAvailable`을 추가한다.
- 오류 처리에서 HTTP status, `error.code`, `Retry-After`를 보존한다.
- Artifact 다운로드 요청에도 JWT를 포함하고 Blob으로 처리한다.
- Admin 업로드는 `FormData`를 사용하고 `Content-Type`은 브라우저가 설정하게 둔다.
