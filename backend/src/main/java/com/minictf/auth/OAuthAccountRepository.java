package com.minictf.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OAuthAccountRepository extends JpaRepository<OAuthAccount,Long> { Optional<OAuthAccount> findByProviderAndProviderSubject(String provider,String providerSubject); }
