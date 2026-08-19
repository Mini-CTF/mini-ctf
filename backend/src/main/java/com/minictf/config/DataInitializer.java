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
    CommandLineRunner createConfiguredAdmin(UserRepository users, PasswordEncoder encoder,
                                             @Value("${ADMIN_USERNAME:}") String username,
                                             @Value("${ADMIN_PASSWORD:}") String password) {
        return args -> {
            if (username == null || username.isBlank() || password == null || password.isBlank() || users.existsByUsername(username)) return;
            User admin = new User();
            admin.setUsername(username);
            admin.setNickname(username);
            admin.setPasswordHash(encoder.encode(password));
            admin.setRole("ADMIN");
            admin.setScore(0);
            users.save(admin);
        };
    }
}
