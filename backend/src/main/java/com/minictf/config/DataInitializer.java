package com.minictf.config;

import com.minictf.user.User;
import com.minictf.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {
  @Bean
  CommandLineRunner createAdmin(
      UserRepository users,
      PasswordEncoder encoder,
      @Value("${ADMIN_USERNAME:}") String username,
      @Value("${ADMIN_PASSWORD:}") String password) {
    return args -> {
      if (username == null || username.isBlank() || password == null || password.isBlank()) return;
      if (password.length() < 12)
        throw new IllegalStateException("ADMIN_PASSWORD must contain at least 12 characters");
      if (!username.matches("[A-Za-z0-9_]{3,50}"))
        throw new IllegalStateException("ADMIN_USERNAME format is invalid");
      User u = users.findByUsernameIgnoreCase(username).orElseGet(User::new);
      if (u.getId() == null) {
        u.setUsername(username);
        u.setNickname(username);
        u.setScore(20_000);
      }
      u.setPasswordHash(encoder.encode(password));
      u.setRole("ADMIN");
      // Keep the platform administrator at the top tier even after restarts.
      u.setScore(20_000);
      if ("super_user".equals(u.getEquippedVaultTitle())) u.setEquippedVaultTitle(null);
      u.setStatus("ACTIVE");
      u.setSuspensionReason(null);
      u.setSuspendedAt(null);
      users.save(u);
    };
  }
}
