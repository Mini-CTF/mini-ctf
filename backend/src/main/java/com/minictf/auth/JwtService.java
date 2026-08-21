package com.minictf.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final long expiration;

  public JwtService(
      @Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiration}") long expiration) {
    if (secret == null || secret.length() < 32)
      throw new IllegalArgumentException("JWT_SECRET must contain at least 32 characters");
    key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expiration = expiration;
  }

  public String createToken(Long userId, String role) {
    Date now = new Date();
    return Jwts.builder()
        .subject(userId.toString())
        .claim("role", role)
        .issuedAt(now)
        .expiration(new Date(now.getTime() + expiration))
        .signWith(key)
        .compact();
  }

  public Claims parse(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }
}
