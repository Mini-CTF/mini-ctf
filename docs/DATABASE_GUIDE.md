# Mini CTF 데이터베이스 운영 가이드

이 프로젝트의 데이터베이스는 PostgreSQL과 Flyway로 관리합니다. 애플리케이션 개발자는 DB 콘솔에서 테이블을 직접 수정하지 않고, 백엔드 저장소에 새 마이그레이션 파일을 추가합니다.

## 스키마 버전

```text
V1__initial_schema.sql       핵심 CTF 테이블
V2__production_hardening.sql 제약조건·인덱스·Community·감사 로그
V3__backend_completion.sql   입력 길이·Artifact 경로·OAuth·랭킹 인덱스 보강
```

이미 실행된 마이그레이션 파일은 수정하지 않습니다. 변경이 필요하면 다음 번호의 파일을 추가합니다.

```text
V3__add_password_reset.sql
V4__add_refresh_tokens.sql
```

## 처음 실행

1. `.env.example`을 복사해 `.env`를 만듭니다.
2. `DATABASE_PASSWORD`를 강한 임의의 비밀번호로 바꿉니다.
3. `JWT_SECRET`을 32자 이상의 임의 문자열로 바꿉니다.
4. PostgreSQL을 시작합니다.

```powershell
cd D:\mini-ctf
Copy-Item .env.example .env
docker compose up -d postgres
```

Spring Boot가 시작되면 Flyway가 V1, V2, V3 순서로 자동 적용합니다. `spring.jpa.hibernate.ddl-auto=validate`이므로 Java 엔티티와 DB 구조가 어긋나면 애플리케이션이 시작되지 않습니다.

2026-08-21 기준 PostgreSQL 16.15의 빈 DB에서 V1→V2→V3 적용과 Hibernate `validate`를 확인했습니다.

## 절대 하지 않는 것

- `V1` 또는 이미 적용된 마이그레이션을 수정하지 않습니다.
- 운영 DB에서 `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`를 실행하지 않습니다.
- `docker compose down -v`를 데이터 삭제 목적으로 사용하지 않습니다.
- `.env`를 GitHub에 커밋하지 않습니다.
- FLAG 원문, 비밀번호, JWT Secret을 DB나 로그에 저장하지 않습니다.

## 확인 방법

```powershell
cd D:\mini-ctf\backend
$env:JAVA_HOME='C:\Path\To\JDK-21'
.\gradlew.bat clean test
```

PostgreSQL 운영 검증은 Docker가 실행 가능한 환경에서 진행하고, H2 테스트는 애플리케이션 컨텍스트와 API 계약 검증용으로만 사용합니다.

## 데이터 삭제가 필요한 개발 테스트

개발용 데이터 초기화가 정말 필요하면 먼저 현재 DB가 개발용인지 확인하고, 삭제 전에 백업합니다. 운영 DB에는 적용하지 않습니다.

```powershell
docker exec mini-ctf-postgres pg_dump -U mini_ctf -d mini_ctf > mini-ctf-backup.sql
```
