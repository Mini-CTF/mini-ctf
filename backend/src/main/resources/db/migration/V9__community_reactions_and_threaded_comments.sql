ALTER TABLE post_comments
    ADD COLUMN parent_id BIGINT REFERENCES post_comments(id) ON DELETE CASCADE,
    ADD COLUMN pinned_at TIMESTAMPTZ;

CREATE INDEX idx_post_comments_parent_created_at
    ON post_comments(post_id, parent_id, created_at);

CREATE TABLE post_reactions (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_post_reactions_type CHECK (reaction_type IN ('LIKE', 'DISLIKE', 'RECOMMEND')),
    CONSTRAINT uq_post_reactions_user UNIQUE (post_id, user_id)
);

CREATE INDEX idx_post_reactions_post_type ON post_reactions(post_id, reaction_type);
