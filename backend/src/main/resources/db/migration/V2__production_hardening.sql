-- V2는 이미 적용된 V1을 수정하지 않고 운영 제약조건과 확장 테이블을 추가한다.

ALTER TABLE users
    ADD CONSTRAINT chk_users_username_format CHECK (username = btrim(username) AND char_length(username) BETWEEN 3 AND 50),
    ADD CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN')),
    ADD CONSTRAINT chk_users_score_nonnegative CHECK (score >= 0);

CREATE UNIQUE INDEX uq_users_username_lower ON users (lower(username));

ALTER TABLE challenges
    ADD CONSTRAINT chk_challenges_title_not_blank CHECK (char_length(btrim(title)) > 0),
    ADD CONSTRAINT chk_challenges_category CHECK (category IN ('WEB', 'CRYPTO', 'FORENSICS', 'MISC', 'REVERSING', 'PWN')),
    ADD CONSTRAINT chk_challenges_difficulty CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'INSANE')),
    ADD CONSTRAINT chk_challenges_score_positive CHECK (score > 0),
    ADD CONSTRAINT chk_challenges_flag_hash_not_blank CHECK (char_length(btrim(flag_hash)) > 0);

ALTER TABLE submissions
    ADD CONSTRAINT chk_submissions_correct_boolean CHECK (is_correct IN (TRUE, FALSE));

ALTER TABLE oauth_accounts
    ADD CONSTRAINT chk_oauth_provider CHECK (provider IN ('google', 'github', 'kakao', 'naver'));

CREATE INDEX idx_submissions_challenge_submitted ON submissions (challenge_id, submitted_at DESC);
CREATE INDEX idx_submissions_user_challenge_submitted ON submissions (user_id, challenge_id, submitted_at DESC);
CREATE INDEX idx_solves_challenge ON solves (challenge_id);
CREATE INDEX idx_oauth_accounts_user ON oauth_accounts (user_id);

CREATE TABLE challenge_comments (
    id BIGSERIAL PRIMARY KEY,
    challenge_id BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    discussion_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_challenge_comments_content_not_blank CHECK (char_length(btrim(content)) > 0),
    CONSTRAINT chk_challenge_comments_type CHECK (discussion_type IN ('GENERAL', 'SOLVER'))
);

CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(20) NOT NULL,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_posts_title_not_blank CHECK (char_length(btrim(title)) > 0),
    CONSTRAINT chk_posts_content_not_blank CHECK (char_length(btrim(content)) > 0),
    CONSTRAINT chk_posts_category CHECK (category IN ('FREE', 'QUESTION', 'CTF', 'NOTICE')),
    CONSTRAINT chk_posts_view_count_nonnegative CHECK (view_count >= 0)
);

CREATE TABLE post_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_post_comments_content_not_blank CHECK (char_length(btrim(content)) > 0)
);

CREATE INDEX idx_challenge_comments_challenge_created ON challenge_comments (challenge_id, created_at ASC);
CREATE INDEX idx_challenge_comments_user ON challenge_comments (user_id);
CREATE INDEX idx_posts_category_created ON posts (category, created_at DESC);
CREATE INDEX idx_posts_user_created ON posts (user_id, created_at DESC);
CREATE INDEX idx_post_comments_post_created ON post_comments (post_id, created_at ASC);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(60) NOT NULL,
    entity_type VARCHAR(40),
    entity_id BIGINT,
    ip_address VARCHAR(45),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_audit_action_not_blank CHECK (char_length(btrim(action)) > 0)
);

CREATE INDEX idx_audit_logs_actor_created ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_created ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);
