ALTER TABLE challenges
    ADD COLUMN IF NOT EXISTS artifact_data BYTEA;
