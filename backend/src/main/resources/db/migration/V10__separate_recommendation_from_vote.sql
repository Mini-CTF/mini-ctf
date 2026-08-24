ALTER TABLE post_reactions
    DROP CONSTRAINT uq_post_reactions_user;

ALTER TABLE post_reactions
    ADD CONSTRAINT uq_post_reactions_user_type UNIQUE (post_id, user_id, reaction_type);
