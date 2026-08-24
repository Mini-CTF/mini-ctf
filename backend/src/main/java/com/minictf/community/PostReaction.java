package com.minictf.community;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "post_reactions")
public class PostReaction {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "post_id", nullable = false)
  private Post post;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "reaction_type", nullable = false, length = 20)
  private String reactionType;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void create() {
    createdAt = Instant.now();
  }

  public Post getPost() {
    return post;
  }

  public void setPost(Post value) {
    post = value;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User value) {
    user = value;
  }

  public String getReactionType() {
    return reactionType;
  }

  public void setReactionType(String value) {
    reactionType = value;
  }
}
