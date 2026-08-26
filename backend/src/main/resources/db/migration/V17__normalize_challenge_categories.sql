-- Normalize legacy challenge categories to the new FlagBox taxonomy:
-- WEB / FORENSIC / REVERSING. The legacy constraint must be replaced before
-- rows can be updated to the new values.

ALTER TABLE challenges DROP CONSTRAINT IF EXISTS chk_challenges_category;

UPDATE challenges SET category = 'FORENSIC' WHERE upper(category) = 'FORENSICS';

UPDATE challenges SET category = 'REVERSING' WHERE upper(category) = 'CRYPTO';

UPDATE challenges SET category = 'FORENSIC' WHERE upper(category) = 'MISC';

ALTER TABLE challenges
    ADD CONSTRAINT chk_challenges_category
    CHECK (category IN ('WEB', 'FORENSIC', 'REVERSING'));
