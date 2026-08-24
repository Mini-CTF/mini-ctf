ALTER TABLE users
    ADD COLUMN cipher_gems INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN vault_fragments INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN equipped_frame VARCHAR(50),
    ADD COLUMN equipped_accessory VARCHAR(50),
    ADD COLUMN equipped_vault_title VARCHAR(50);

CREATE TABLE vault_mission_completions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_id VARCHAR(50) NOT NULL,
    mission_date DATE NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vault_mission_user_day UNIQUE (user_id, mission_id, mission_date)
);

CREATE TABLE vault_owned_cosmetics (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cosmetic_id VARCHAR(50) NOT NULL,
    source VARCHAR(30) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vault_cosmetic_user UNIQUE (user_id, cosmetic_id)
);

CREATE INDEX idx_vault_missions_user_date ON vault_mission_completions(user_id, mission_date DESC);
CREATE INDEX idx_vault_cosmetics_user ON vault_owned_cosmetics(user_id);
