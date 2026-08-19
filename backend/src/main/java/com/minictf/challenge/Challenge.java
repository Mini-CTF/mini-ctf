package com.minictf.challenge;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "challenges")
public class Challenge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String description;
    @Column(nullable = false, length = 30) private String category;
    @Column(nullable = false, length = 20) private String difficulty;
    @Column(nullable = false) private int score;
    @Column(name = "flag_hash", nullable = false) private String flagHash;
    @Column(name = "artifact_path") private String artifactPath;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public String getFlagHash() { return flagHash; }
    public void setFlagHash(String flagHash) { this.flagHash = flagHash; }
    public String getArtifactPath() { return artifactPath; }
    public void setArtifactPath(String artifactPath) { this.artifactPath = artifactPath; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
