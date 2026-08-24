package com.minictf.vault;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "vault_hidden_missions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "mission_id"}))
public class VaultHiddenMission {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(name = "mission_id", nullable = false, length = 50)
  private String missionId;

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
}
