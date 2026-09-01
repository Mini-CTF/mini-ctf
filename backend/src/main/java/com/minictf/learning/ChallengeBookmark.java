package com.minictf.learning;

import com.minictf.challenge.Challenge;
import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "challenge_bookmarks")
@IdClass(ChallengeBookmarkId.class)
public class ChallengeBookmark {
  @Id
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  private User user;

  @Id
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "challenge_id")
  private Challenge challenge;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public User getUser() { return user; }
  public void setUser(User user) { this.user = user; }
  public Challenge getChallenge() { return challenge; }
  public void setChallenge(Challenge challenge) { this.challenge = challenge; }
  public Instant getCreatedAt() { return createdAt; }
}
