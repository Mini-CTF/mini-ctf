Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Mini CTF operations guide

## Database roles

New Docker installations create two PostgreSQL roles:

- `mini_ctf_owner`: owns the database and is used only by Flyway migrations and backups.
- `mini_ctf_app`: the running Spring application role. It has `SELECT`, `INSERT`, `UPDATE`, and `DELETE` permissions, but cannot alter tables or create roles.

Set `DATABASE_*` to the application role and `FLYWAY_*` to the owner role. The role-init script runs only for a new Docker data volume; never use `docker compose down -v` on a database that contains wanted data.

## Backup and recovery

Create a PostgreSQL custom-format backup (ignored by Git):

```powershell
cd <repository>
.\scripts\Backup-Database.ps1
```

The backup is written to `backups\mini-ctf-<timestamp>.dump`. Run it daily with Windows Task Scheduler or your deployment platform scheduler and copy the backup to storage outside the server.

Restore is deliberately opt-in because it replaces database contents:

```powershell
.\scripts\Restore-Database.ps1 -BackupPath .\backups\mini-ctf-<timestamp>.dump -ConfirmRestore
```

Before restoring, stop the backend, verify the selected file and make a fresh backup of the current database. Restart the backend afterwards; Flyway validates the restored schema.

## Data retention

The backend performs a daily 03:15 UTC cleanup. Defaults are:

| Data | Retention | Action |
|---|---:|---|
| Direct messages | 180 days | Permanently deleted |
| Challenge activity signals | 90 days | Permanently deleted |
| Login and account security events | 365 days | Permanently deleted |
| Anti-cheat events | 365 days | Permanently deleted |
| Administrator audit records | Indefinite | Only redact/hide through the admin UI |

Change the environment values shown in `.env.example` to change a retention period. Do not set any duration below one day.

## Avatar storage

`PROFILE_STORAGE=local` is intended for local development. For a deployed service, set `PROFILE_STORAGE=s3` and configure `PROFILE_S3_BUCKET`, `PROFILE_S3_REGION`, `PROFILE_S3_ENDPOINT` (only for MinIO or another S3-compatible provider), `PROFILE_S3_ACCESS_KEY`, and `PROFILE_S3_SECRET_KEY`.

Avatar objects stay private in the bucket: the backend fetches and validates them before returning the existing `/api/users/{username}/avatar` route. Give the storage credential access only to the selected bucket and never commit it to Git.

## Real-time direct messages

The browser opens an authenticated Server-Sent Events stream at `/api/social/messages/stream`. This provides real-time inbox updates without placing a JWT in a URL or requiring a polling loop. A message is sent to the recipient only after its database transaction commits. The stream is automatically renewed by the browser after its 25-minute lifetime.
