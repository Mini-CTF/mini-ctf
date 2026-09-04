-- The shop, rubies, profile cosmetics, and paid hint credits have been retired.
-- Administrative titles continue to be derived from users.role (ADMIN/MODERATOR).
DROP TABLE IF EXISTS vault_hidden_missions;
DROP TABLE IF EXISTS vault_mission_completions;
DROP TABLE IF EXISTS vault_owned_cosmetics;

ALTER TABLE users
    DROP COLUMN IF EXISTS attendance_title,
    DROP COLUMN IF EXISTS cipher_gems,
    DROP COLUMN IF EXISTS vault_fragments,
    DROP COLUMN IF EXISTS equipped_frame,
    DROP COLUMN IF EXISTS equipped_accessory,
    DROP COLUMN IF EXISTS equipped_vault_title,
    DROP COLUMN IF EXISTS hidden_vault_unlocked,
    DROP COLUMN IF EXISTS hidden_vault_rewarded,
    DROP COLUMN IF EXISTS hint_credits;

ALTER TABLE challenges
    DROP COLUMN IF EXISTS hint_cost;
