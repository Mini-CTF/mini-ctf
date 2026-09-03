ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role CHECK (role IN ('USER', 'MODERATOR', 'ADMIN'));
