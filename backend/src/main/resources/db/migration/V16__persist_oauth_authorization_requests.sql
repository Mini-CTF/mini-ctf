CREATE TABLE oauth_authorization_requests (
    state VARCHAR(512) PRIMARY KEY,
    payload TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_oauth_authorization_requests_expires_at
    ON oauth_authorization_requests (expires_at);
