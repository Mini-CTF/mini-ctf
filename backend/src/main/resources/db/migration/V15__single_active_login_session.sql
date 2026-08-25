ALTER TABLE users
    ADD COLUMN auth_session_version BIGINT NOT NULL DEFAULT 0;
