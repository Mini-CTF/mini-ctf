package com.minictf.auth;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
  Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

  void deleteByUserId(Long userId);

  long deleteByExpiresAtBefore(Instant value);
}
