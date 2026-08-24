package com.minictf.vault;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "vault_owned_cosmetics",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "cosmetic_id"}))
public class VaultOwnedCosmetic {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(name = "cosmetic_id", nullable = false, length = 50)
  private String cosmeticId;

  @Column(nullable = false, length = 30)
  private String source;

  @Column(name = "acquired_at", nullable = false)
  private Instant acquiredAt;

  @PrePersist
  void create() {
    if (acquiredAt == null) acquiredAt = Instant.now();
  }

  public void setUser(User value) {
    user = value;
  }

  public void setCosmeticId(String value) {
    cosmeticId = value;
  }

  public void setSource(String value) {
    source = value;
  }

  public String getCosmeticId() {
    return cosmeticId;
  }
}
