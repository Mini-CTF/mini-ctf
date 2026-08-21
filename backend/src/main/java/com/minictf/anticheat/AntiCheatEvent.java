package com.minictf.anticheat;

import com.minictf.challenge.Challenge;
import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "anti_cheat_events")
public class AntiCheatEvent {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "challenge_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Challenge challenge;

  @Column(name = "event_type", nullable = false, length = 60)
  private String eventType;

  @Column(nullable = false, length = 20)
  private String severity;

  @Column(nullable = false, length = 1000)
  private String detail;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void create() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public Challenge getChallenge() {
    return challenge;
  }

  public String getEventType() {
    return eventType;
  }

  public String getSeverity() {
    return severity;
  }

  public String getDetail() {
    return detail;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setUser(User value) {
    user = value;
  }

  public void setChallenge(Challenge value) {
    challenge = value;
  }

  public void setEventType(String value) {
    eventType = value;
  }

  public void setSeverity(String value) {
    severity = value;
  }

  public void setDetail(String value) {
    detail = value;
  }
}
