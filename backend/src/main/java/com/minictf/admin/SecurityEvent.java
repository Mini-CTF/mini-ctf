package com.minictf.admin;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "security_events")
public class SecurityEvent {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  @OnDelete(action = OnDeleteAction.SET_NULL)
  private User user;

  @Column(nullable = false, length = 50)
  private String eventType;

  @Column(length = 100)
  private String subject;

  @Column(name = "ip_address", length = 64)
  private String ipAddress;

  @Column(name = "device_fingerprint", length = 64)
  private String deviceFingerprint;

  @Column(length = 1000)
  private String detail;

  @Column(name = "is_hidden", nullable = false)
  private boolean hidden;

  @Column(name = "redacted_at")
  private Instant redactedAt;

  @Column(name = "redaction_reason", length = 500)
  private String redactionReason;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void create() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public String getEventType() {
    return eventType;
  }

  public String getSubject() {
    return subject;
  }

  public String getIpAddress() {
    return ipAddress;
  }

  public String getDeviceFingerprint() {
    return deviceFingerprint;
  }

  public String getDetail() {
    return detail;
  }

  public boolean isHidden() {
    return hidden;
  }

  public Instant getRedactedAt() {
    return redactedAt;
  }

  public String getRedactionReason() {
    return redactionReason;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setUser(User value) {
    user = value;
  }

  public void setEventType(String value) {
    eventType = value;
  }

  public void setSubject(String value) {
    subject = value;
  }

  public void setIpAddress(String value) {
    ipAddress = value;
  }

  public void setDeviceFingerprint(String value) {
    deviceFingerprint = value;
  }

  public void setDetail(String value) {
    detail = value;
  }

  public void setHidden(boolean value) {
    hidden = value;
  }

  public void redact(String reason) {
    detail = "[redacted]";
    redactedAt = Instant.now();
    redactionReason = reason;
  }
}
