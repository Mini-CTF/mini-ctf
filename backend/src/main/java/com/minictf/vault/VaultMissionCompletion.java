package com.minictf.vault;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
    name = "vault_mission_completions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "mission_id", "mission_date"}))
public class VaultMissionCompletion {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(name = "mission_id", nullable = false, length = 50)
  private String missionId;

  @Column(name = "mission_date", nullable = false)
  private LocalDate missionDate;

  @Column(name = "completed_at", nullable = false)
  private Instant completedAt;

  @PrePersist
  void create() {
    if (completedAt == null) completedAt = Instant.now();
  }

  public void setUser(User value) {
    user = value;
  }

  public void setMissionId(String value) {
    missionId = value;
  }

  public void setMissionDate(LocalDate value) {
    missionDate = value;
  }
}
