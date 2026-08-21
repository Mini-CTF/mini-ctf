-- API 입력 검증과 동일한 한도를 DB에서도 보장하고 자주 사용하는 조회를 보강한다.

ALTER TABLE users
    ADD CONSTRAINT chk_users_nickname_length CHECK (nickname IS NULL OR char_length(nickname) <= 80);

ALTER TABLE challenges
    ADD CONSTRAINT chk_challenges_description_length CHECK (char_length(description) <= 20000),
    ADD CONSTRAINT chk_challenges_artifact_path_relative CHECK (
        artifact_path IS NULL OR (
            char_length(btrim(artifact_path)) BETWEEN 1 AND 500
            AND artifact_path NOT LIKE '/%'
            AND position('..' IN artifact_path) = 0
        )
    );

ALTER TABLE challenge_comments
    ADD CONSTRAINT chk_challenge_comments_content_length CHECK (char_length(content) <= 2000);

ALTER TABLE posts
    ADD CONSTRAINT chk_posts_content_length CHECK (char_length(content) <= 20000);

ALTER TABLE post_comments
    ADD CONSTRAINT chk_post_comments_content_length CHECK (char_length(content) <= 2000);

CREATE UNIQUE INDEX uq_oauth_accounts_user_provider ON oauth_accounts (user_id, provider);
CREATE INDEX idx_users_ranking ON users (score DESC, username ASC);
CREATE INDEX idx_challenge_active_id ON challenges (is_active, id);
