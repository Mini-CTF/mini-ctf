package com.minictf.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 50)
  private String username;

  @Column(length = 80)
  private String nickname;

  @JsonIgnore
  @Column(name = "password_hash")
  private String passwordHash;

  @Column(nullable = false, length = 20)
  private String role = "USER";

  @Column(nullable = false)
  private int score;

  @Column(nullable = false, length = 20)
  private String status = "ACTIVE";

  @Column(name = "suspension_reason", length = 500)
  private String suspensionReason;

  @Column(name = "suspended_at")
  private Instant suspendedAt;

  @Column(name = "status_message", length = 160)
  private String statusMessage;

  @Column(name = "avatar_path", length = 500)
  private String avatarPath;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String value) {
    username = value;
  }

  public String getNickname() {
    return nickname;
  }

  public void setNickname(String value) {
    nickname = value;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String value) {
    passwordHash = value;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String value) {
    role = value;
  }

  public int getScore() {
    return score;
  }

  public void setScore(int value) {
    score = value;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String value) {
    status = value;
  }

  public String getSuspensionReason() {
    return suspensionReason;
  }

  public void setSuspensionReason(String value) {
    suspensionReason = value;
  }

  public Instant getSuspendedAt() {
    return suspendedAt;
  }

  public void setSuspendedAt(Instant value) {
    suspendedAt = value;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public String getStatusMessage() {
    return statusMessage;
  }

  public void setStatusMessage(String value) {
    statusMessage = value;
  }

  public String getAvatarPath() {
    return avatarPath;
  }

  public void setAvatarPath(String value) {
    avatarPath = value;
  }
}
