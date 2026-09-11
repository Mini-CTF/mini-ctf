ALTER TABLE challenges
    ADD COLUMN IF NOT EXISTS seed_key VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS uq_challenges_seed_key
    ON challenges (seed_key)
    WHERE seed_key IS NOT NULL;

-- These rows were left behind by historical title changes. Keep their FK-linked
-- submissions and solves intact, but remove them from the public catalog.
UPDATE challenges
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE seed_key IS NULL
  AND title IN ('꺼져 있는 문은 잠긴 까', '규칙을 찾아서');
