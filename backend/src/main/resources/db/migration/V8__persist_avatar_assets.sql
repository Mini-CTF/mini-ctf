CREATE TABLE avatar_assets (
    storage_key VARCHAR(500) PRIMARY KEY,
    content BYTEA NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
