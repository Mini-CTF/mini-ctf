package com.minictf.admin;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "admin_audit_logs")
public class AdminAuditLog {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "admin_user_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User admin;

  @Column(nullable = false, length = 50)
  private String action;

  @Column(name = "target_type", nullable = false, length = 50)
  private String targetType;

  @Column(name = "target_id")
  private Long targetId;

  @Column(length = 1000)
  private String detail;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void create() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getAdmin() {
    return admin;
  }

  public void setAdmin(User value) {
    admin = value;
  }

  public String getAction() {
    return action;
  }

  public void setAction(String value) {
    action = value;
  }

  public String getTargetType() {
    return targetType;
  }

  public void setTargetType(String value) {
    targetType = value;
  }

  public Long getTargetId() {
    return targetId;
  }

  public void setTargetId(Long value) {
    targetId = value;
  }

  public String getDetail() {
    return detail;
  }

  public void setDetail(String value) {
    detail = value;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
