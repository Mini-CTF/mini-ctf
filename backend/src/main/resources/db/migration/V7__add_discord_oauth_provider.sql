ALTER TABLE oauth_accounts DROP CONSTRAINT chk_oauth_provider;

ALTER TABLE oauth_accounts
    ADD CONSTRAINT chk_oauth_provider
    CHECK (provider IN ('google', 'github', 'kakao', 'discord', 'naver'));
