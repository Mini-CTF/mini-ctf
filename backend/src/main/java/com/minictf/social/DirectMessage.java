package com.minictf.social;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "direct_messages")
public class DirectMessage {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "sender_id")
  private User sender;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "recipient_id")
  private User recipient;

  @Column(nullable = false, length = 2000)
  private String content;

  @Column(name = "read_at")
  private Instant readAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void create() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getSender() {
    return sender;
  }

  public User getRecipient() {
    return recipient;
  }

  public String getContent() {
    return content;
  }

  public Instant getReadAt() {
    return readAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setSender(User value) {
    sender = value;
  }

  public void setRecipient(User value) {
    recipient = value;
  }

  public void setContent(String value) {
    content = value;
  }

  public void markRead() {
    if (readAt == null) readAt = Instant.now();
  }
}
