ALTER TABLE users
    ADD COLUMN deleted_original_username VARCHAR(50),
    ADD COLUMN deleted_original_nickname VARCHAR(80),
    ADD COLUMN deleted_original_score INTEGER,
    ADD COLUMN deleted_original_status VARCHAR(20),
    ADD COLUMN deleted_original_suspension_reason VARCHAR(500),
    ADD COLUMN deleted_original_suspended_at TIMESTAMPTZ,
    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_users_status_score_username ON users(status, score DESC, username ASC);
