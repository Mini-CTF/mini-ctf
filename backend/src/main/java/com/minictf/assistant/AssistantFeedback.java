package com.minictf.assistant;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assistant_feedback")
public class AssistantFeedback {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false)
  private int rating;

  @Column(length = 1000)
  private String comment;

  @Column(nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  public Long getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User value) {
    user = value;
  }

  public int getRating() {
    return rating;
  }

  public void setRating(int value) {
    rating = value;
  }

  public String getComment() {
    return comment;
  }

  public void setComment(String value) {
    comment = value;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
