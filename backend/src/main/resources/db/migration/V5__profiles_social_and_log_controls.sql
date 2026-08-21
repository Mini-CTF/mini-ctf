ALTER TABLE users
    ADD COLUMN status_message VARCHAR(160),
    ADD COLUMN avatar_path VARCHAR(500);

ALTER TABLE admin_audit_logs
    ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN redacted_at TIMESTAMPTZ,
    ADD COLUMN redaction_reason VARCHAR(500);

CREATE TABLE security_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    subject VARCHAR(100),
    ip_address VARCHAR(64),
    detail VARCHAR(1000),
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    redacted_at TIMESTAMPTZ,
    redaction_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE friendships (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_friendships_direction UNIQUE (requester_id, recipient_id),
    CONSTRAINT chk_friendships_distinct_users CHECK (requester_id <> recipient_id)
);

CREATE TABLE direct_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_friendships_recipient_status ON friendships(recipient_id, status);
CREATE INDEX idx_direct_messages_conversation ON direct_messages(sender_id, recipient_id, created_at);
