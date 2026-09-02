-- Keep the existing normalized categories and allow the two new wargame fields.
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS chk_challenges_category;

ALTER TABLE challenges
    ADD CONSTRAINT chk_challenges_category
    CHECK (category IN ('WEB', 'FORENSIC', 'REVERSING', 'CRYPTO', 'MISC'));
