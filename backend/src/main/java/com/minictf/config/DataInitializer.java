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
      if (users.existsByUsernameIgnoreCase(username)) return;
      User u = new User();
      u.setUsername(username);
      u.setNickname(username);
      u.setPasswordHash(encoder.encode(password));
      u.setRole("ADMIN");
      u.setScore(0);
      users.save(u);
    };
  }
}
