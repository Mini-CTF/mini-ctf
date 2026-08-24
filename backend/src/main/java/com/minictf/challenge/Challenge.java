package com.minictf.challenge;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "challenges")
public class Challenge {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 160)
  private String title;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String description;

  @Column(nullable = false, length = 30)
  private String category;

  @Column(nullable = false, length = 20)
  private String difficulty;

  @Column(nullable = false)
  private int score;

  @JsonIgnore
  @Column(name = "flag_hash", nullable = false)
  private String flagHash;

  @JsonIgnore
  @Column(name = "artifact_path", length = 500)
  private String artifactPath;

  @JsonIgnore
  @Column(name = "hint_text", columnDefinition = "TEXT")
  private String hintText;

  @Column(name = "hint_cost", nullable = false)
  private int hintCost = 1;

  @Column(name = "is_active", nullable = false)
  private boolean active = true;

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

  public String getTitle() {
    return title;
  }

  public void setTitle(String v) {
    title = v;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String v) {
    description = v;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String v) {
    category = v;
  }

  public String getDifficulty() {
    return difficulty;
  }

  public void setDifficulty(String v) {
    difficulty = v;
  }

  public int getScore() {
    return score;
  }

  public void setScore(int v) {
    score = v;
  }

  public String getFlagHash() {
    return flagHash;
  }

  public void setFlagHash(String v) {
    flagHash = v;
  }

  public String getArtifactPath() {
    return artifactPath;
  }

  public void setArtifactPath(String v) {
    artifactPath = v;
  }

  public String getHintText() {
    return hintText;
  }

  public void setHintText(String v) {
    hintText = v;
  }

  public int getHintCost() {
    return hintCost;
  }

  public void setHintCost(int v) {
    hintCost = v;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean v) {
    active = v;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
