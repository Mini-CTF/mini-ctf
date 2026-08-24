ALTER TABLE users
    ADD COLUMN attendance_title VARCHAR(40);

CREATE TABLE attendance_checkins (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_user_date UNIQUE (user_id, checkin_date)
);

CREATE INDEX idx_attendance_user_date ON attendance_checkins(user_id, checkin_date DESC);
CREATE INDEX idx_attendance_date ON attendance_checkins(checkin_date DESC);
