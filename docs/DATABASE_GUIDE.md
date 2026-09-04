# FlagBox 데이터베이스 가이드

FlagBox는 PostgreSQL을 사용하며, DB 구조 변경은 `backend/src/main/resources/db/migration`의
Flyway 마이그레이션으로만 수행한다. 이미 운영 DB에 적용한 마이그레이션 파일은 수정하지 않고,
다음 번호의 새 파일을 추가한다.

## 핵심 관계

`users.id`가 사용자 데이터의 중심 PK다. 다른 테이블의 `*_user_id` 또는 `user_id` FK가 이를
참조한다.

```text
users
 ├─ submissions, solves ─ challenges
 ├─ attendance_checkins
 ├─ posts ─ post_comments ─ post_reactions
 ├─ challenge_comments, challenge_likes, challenge_bookmarks
 ├─ friendships, direct_messages
 ├─ oauth_accounts, password_reset_tokens
 ├─ learning_goals, user_achievements, platform_notifications
 └─ security_events, audit_logs, admin_audit_logs
```

- PK는 테이블의 한 행을 고유하게 식별한다. 예: `users.id`, `challenges.id`.
- FK는 다른 테이블의 PK를 참조해 관계를 만든다. 예: `submissions.user_id → users.id`.
- `submissions`·`solves`는 사용자와 문제의 N:M 관계를 표현한다.
- `challenge_bookmarks`, `challenge_likes`는 `(user_id, challenge_id)` 복합 PK로 중복 저장을 막는다.
- `learning_goals.user_id`는 PK이자 FK라 사용자당 목표 하나인 1:1 관계다.
- 사용자 종속 데이터는 주로 `ON DELETE CASCADE`로 정리한다. 감사/보안 기록 일부는
  `ON DELETE SET NULL`로 사용자 삭제 뒤에도 기록을 보존한다.

## 현재 마이그레이션 범위

현재 스키마는 V1부터 V29까지의 누적 결과다. V12는 출석, V19는 로컬 계정 이메일·재설정,
V22는 학습 허브, V23~V27은 IP 차단·반응·기기 식별·카테고리·부관리자 역할을 추가한다.
V29는 퇴역한 상점/루비/보관함/꾸미기·유료 힌트 크레딧 테이블과 컬럼을 제거한다.

## 운영 원칙

- 운영 DB에서 테이블을 직접 수정하거나 과거 Flyway 파일을 고치지 않는다.
- 변경 전 백업을 만들고, Flyway 실행 계정과 애플리케이션 실행 계정을 분리한다.
- `.env`와 DB 비밀번호·JWT 비밀값·FLAG는 커밋하지 않는다.
- 개발 DB를 초기화해야 할 경우에도 대상 DB와 백업 여부를 먼저 확인한다.

## 로컬 검증

```powershell
Copy-Item .env.example .env
docker compose up -d postgres

cd backend
.\gradlew.bat test
```

`spring.jpa.hibernate.ddl-auto=validate` 설정으로 JPA 엔티티와 Flyway 스키마의 불일치를 조기에 확인한다.
