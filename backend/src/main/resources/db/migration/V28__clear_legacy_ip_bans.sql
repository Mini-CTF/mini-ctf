-- The legacy IP-ban feature is no longer used for account moderation.
-- Clear only active block entries so previously banned visitors can access FlagBox again.
DELETE FROM ip_bans;
