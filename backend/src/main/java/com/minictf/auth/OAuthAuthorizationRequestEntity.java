package com.minictf.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "oauth_authorization_requests")
public class OAuthAuthorizationRequestEntity {
  @Id
  @Column(length = 512)
  private String state;

  @Lob
  @Column(nullable = false)
  private String payload;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  public String getState() { return state; }
  public void setState(String value) { state = value; }
  public String getPayload() { return payload; }
  public void setPayload(String value) { payload = value; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant value) { expiresAt = value; }
}
