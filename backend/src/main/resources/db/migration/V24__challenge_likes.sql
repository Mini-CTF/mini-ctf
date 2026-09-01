CREATE TABLE challenge_likes (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, challenge_id)
);

CREATE INDEX idx_challenge_likes_challenge ON challenge_likes(challenge_id);
