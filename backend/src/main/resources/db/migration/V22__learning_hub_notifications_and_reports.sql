-- Additive migration: historical Flyway migrations remain immutable for deployed databases.

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS solution_guide TEXT;

CREATE TABLE IF NOT EXISTS challenge_bookmarks (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS learning_goals (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    weekly_solve_target INTEGER NOT NULL DEFAULT 3 CHECK (weekly_solve_target BETWEEN 1 AND 20),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(80) NOT NULL,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, code)
);

CREATE TABLE IF NOT EXISTS platform_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(300),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('POST', 'COMMENT')),
    target_id BIGINT NOT NULL,
    reason VARCHAR(80) NOT NULL,
    detail VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    handled_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    handled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_content_reports_reporter_target UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created ON challenge_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON platform_notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_challenge_time ON submissions(user_id, challenge_id, submitted_at DESC);
