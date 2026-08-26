-- Five clearly separated learning levels for FlagBox beginners.
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS chk_challenges_difficulty;

UPDATE challenges
SET difficulty = CASE difficulty
    WHEN 'EASY' THEN 'BEGINNER'
    WHEN 'MEDIUM' THEN 'EASY'
    WHEN 'HARD' THEN 'NORMAL'
    WHEN 'INSANE' THEN 'ADVANCED'
    ELSE difficulty
END;

UPDATE challenges
SET score = CASE difficulty
    WHEN 'BEGINNER' THEN 50
    WHEN 'EASY' THEN 150
    WHEN 'NORMAL' THEN 300
    WHEN 'ADVANCED' THEN 600
    WHEN 'EXPERT' THEN 1000
    ELSE score
END;

ALTER TABLE challenges
    ADD CONSTRAINT chk_challenges_difficulty
    CHECK (difficulty IN ('BEGINNER', 'EASY', 'NORMAL', 'ADVANCED', 'EXPERT'));
