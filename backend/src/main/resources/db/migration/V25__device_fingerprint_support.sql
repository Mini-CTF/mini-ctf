ALTER TABLE security_events ADD COLUMN device_fingerprint VARCHAR(64);
CREATE INDEX idx_security_events_device_fingerprint ON security_events(device_fingerprint);
CREATE INDEX idx_security_events_type_ip ON security_events(event_type, ip_address);
CREATE INDEX idx_security_events_type_fp ON security_events(event_type, device_fingerprint);
