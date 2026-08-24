ALTER TABLE users
    ADD COLUMN hidden_vault_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN hidden_vault_rewarded BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN hint_credits INTEGER NOT NULL DEFAULT 0;

ALTER TABLE challenges
    ADD COLUMN hint_text TEXT,
    ADD COLUMN hint_cost INTEGER NOT NULL DEFAULT 1;

CREATE TABLE vault_hidden_missions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_id VARCHAR(50) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vault_hidden_mission_user UNIQUE (user_id, mission_id)
);

ALTER TABLE users
    ADD CONSTRAINT chk_users_hint_credits_nonnegative CHECK (hint_credits >= 0);

CREATE INDEX idx_vault_hidden_missions_user ON vault_hidden_missions(user_id);
