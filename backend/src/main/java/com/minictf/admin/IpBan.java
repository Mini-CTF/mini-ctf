package com.minictf.admin;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ip_bans")
public class IpBan {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ip_address", nullable = false, unique = true, length = 45)
  private String ipAddress;

  @Column(nullable = false, length = 500)
  private String reason;

  @Column(name = "created_by", nullable = false, length = 80)
  private String createdBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public String getIpAddress() {
    return ipAddress;
  }

  public String getReason() {
    return reason;
  }

  public String getCreatedBy() {
    return createdBy;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setIpAddress(String value) {
    ipAddress = value;
  }

  public void setReason(String value) {
    reason = value;
  }

  public void setCreatedBy(String value) {
    createdBy = value;
  }
}
