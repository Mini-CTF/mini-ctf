package com.minictf.anticheat;

import com.minictf.challenge.Challenge;
import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "challenge_activity_events")
public class ChallengeActivityEvent {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "challenge_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Challenge challenge;

  @Column(name = "activity_type", nullable = false, length = 30)
  private String activityType;

  @Column(name = "ip_address", length = 64)
  private String ipAddress;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @PrePersist
  void create() {
    if (occurredAt == null) occurredAt = Instant.now();
  }

  public void setUser(User value) {
    user = value;
  }

  public void setChallenge(Challenge value) {
    challenge = value;
  }

  public void setActivityType(String value) {
    activityType = value;
  }

  public void setIpAddress(String value) {
    ipAddress = value;
  }

  public Instant getOccurredAt() {
    return occurredAt;
  }
}
