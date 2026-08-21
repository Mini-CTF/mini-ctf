package com.minictf.social;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "friendships")
public class Friendship {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "requester_id")
  private User requester;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "recipient_id")
  private User recipient;

  @Column(nullable = false, length = 20)
  private String status = "PENDING";

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  void create() {
    Instant now = Instant.now();
    if (createdAt == null) createdAt = now;
    if (updatedAt == null) updatedAt = now;
  }

  @PreUpdate
  void update() {
    updatedAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getRequester() {
    return requester;
  }

  public User getRecipient() {
    return recipient;
  }

  public String getStatus() {
    return status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setRequester(User value) {
    requester = value;
  }

  public void setRecipient(User value) {
    recipient = value;
  }

  public void setStatus(String value) {
    status = value;
  }
}
