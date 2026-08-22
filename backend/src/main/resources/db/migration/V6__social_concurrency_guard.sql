-- A friendship is an unordered pair. This index prevents two simultaneous, opposite requests.
CREATE UNIQUE INDEX uq_friendships_pair
    ON friendships (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));
