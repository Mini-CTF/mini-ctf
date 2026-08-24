package com.minictf.attendance;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
    name = "attendance_checkins",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "checkin_date"}))
public class AttendanceCheckin {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "checkin_date", nullable = false)
  private LocalDate checkinDate;

  @Column(name = "checked_in_at", nullable = false)
  private Instant checkedInAt;

  @PrePersist
  void create() {
    if (checkedInAt == null) checkedInAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User value) {
    user = value;
  }

  public LocalDate getCheckinDate() {
    return checkinDate;
  }

  public void setCheckinDate(LocalDate value) {
    checkinDate = value;
  }

  public Instant getCheckedInAt() {
    return checkedInAt;
  }
}
