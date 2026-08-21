package com.minictf.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, Long> {
  Optional<OAuthAccount> findByProviderAndProviderSubject(String provider, String providerSubject);
}
