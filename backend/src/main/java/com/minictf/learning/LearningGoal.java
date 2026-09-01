package com.minictf.learning;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "learning_goals")
public class LearningGoal {
  @Id private Long userId;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @MapsId
  @JoinColumn(name = "user_id")
  private User user;

  @Column(name = "weekly_solve_target", nullable = false)
  private int weeklySolveTarget = 3;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  @PreUpdate
  void stamp() { updatedAt = Instant.now(); }

  public void setUser(User user) { this.user = user; }
  public int getWeeklySolveTarget() { return weeklySolveTarget; }
  public void setWeeklySolveTarget(int weeklySolveTarget) { this.weeklySolveTarget = weeklySolveTarget; }
}
