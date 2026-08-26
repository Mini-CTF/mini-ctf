package com.minictf.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthAuthorizationRequestEntityRepository
    extends JpaRepository<OAuthAuthorizationRequestEntity, String> {}
