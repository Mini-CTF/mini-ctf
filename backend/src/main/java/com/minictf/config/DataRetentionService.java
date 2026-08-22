package com.minictf.config;

import com.minictf.admin.SecurityEventRepository;
import com.minictf.anticheat.AntiCheatEventRepository;
import com.minictf.anticheat.ChallengeActivityEventRepository;
import com.minictf.social.DirectMessageRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Removes expired private data; administrator audit records remain immutable unless explicitly
 * redacted.
 */
@Service
public class DataRetentionService {
  private final DirectMessageRepository messages;
  private final ChallengeActivityEventRepository activities;
  private final SecurityEventRepository securityEvents;
  private final AntiCheatEventRepository antiCheatEvents;
  private final boolean enabled;
  private final long directMessagesDays;
  private final long activityEventsDays;
  private final long securityEventsDays;
  private final long antiCheatEventsDays;

  public DataRetentionService(
      DirectMessageRepository messages,
      ChallengeActivityEventRepository activities,
      SecurityEventRepository securityEvents,
      AntiCheatEventRepository antiCheatEvents,
      @Value("${app.retention.enabled}") boolean enabled,
      @Value("${app.retention.direct-messages-days}") long directMessagesDays,
      @Value("${app.retention.activity-events-days}") long activityEventsDays,
      @Value("${app.retention.security-events-days}") long securityEventsDays,
      @Value("${app.retention.anti-cheat-events-days}") long antiCheatEventsDays) {
    this.messages = messages;
    this.activities = activities;
    this.securityEvents = securityEvents;
    this.antiCheatEvents = antiCheatEvents;
    this.enabled = enabled;
    this.directMessagesDays = positive(directMessagesDays);
    this.activityEventsDays = positive(activityEventsDays);
    this.securityEventsDays = positive(securityEventsDays);
    this.antiCheatEventsDays = positive(antiCheatEventsDays);
  }

  @Scheduled(cron = "${RETENTION_CRON:0 15 3 * * *}", zone = "UTC")
  @Transactional
  public void purgeExpiredData() {
    if (!enabled) return;
    Instant now = Instant.now();
    messages.deleteOlderThan(now.minus(directMessagesDays, ChronoUnit.DAYS));
    activities.deleteOlderThan(now.minus(activityEventsDays, ChronoUnit.DAYS));
    securityEvents.deleteOlderThan(now.minus(securityEventsDays, ChronoUnit.DAYS));
    antiCheatEvents.deleteOlderThan(now.minus(antiCheatEventsDays, ChronoUnit.DAYS));
  }

  private long positive(long days) {
    if (days < 1) throw new IllegalArgumentException("Retention days must be positive");
    return days;
  }
}
