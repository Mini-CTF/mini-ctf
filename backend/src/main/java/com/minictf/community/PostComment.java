package com.minictf.community;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "post_comments")
public class PostComment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "post_id", nullable = false)
  private Post post;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_id")
  private PostComment parent;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "pinned_at")
  private Instant pinnedAt;

  @PrePersist
  void create() {
    Instant now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void update() {
    updatedAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public Post getPost() {
    return post;
  }

  public void setPost(Post v) {
    post = v;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User v) {
    user = v;
  }

  public PostComment getParent() {
    return parent;
  }

  public void setParent(PostComment value) {
    parent = value;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String v) {
    content = v;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Instant getPinnedAt() {
    return pinnedAt;
  }

  public void setPinnedAt(Instant value) {
    pinnedAt = value;
  }
}
