package com.minictf.config;

import com.minictf.challenge.Challenge;
import com.minictf.challenge.ChallengeRepository;
import com.minictf.challenge.Solve;
import com.minictf.challenge.SolveRepository;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import java.util.Set;
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
      ChallengeRepository challenges,
      SolveRepository solves,
      PasswordEncoder encoder,
      @Value("${ADMIN_USERNAME:}") String username,
      @Value("${ADMIN_PASSWORD:}") String password) {
    return args -> {
      if (username != null && !username.isBlank() && password != null && !password.isBlank()) {
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
        u.setStatus("ACTIVE");
        u.setSuspensionReason(null);
        u.setSuspendedAt(null);
        users.save(u);
      }

      // Existing production administrators may predate ADMIN_USERNAME. Keep every ADMIN user's
      // showcase history synchronized without fabricating normal submission attempts.
      for (User admin : users.findByRole("ADMIN")) {
        syncAdminSolves(admin, challenges, solves);
      }
    };
  }

  private static void syncAdminSolves(
      User admin, ChallengeRepository challenges, SolveRepository solves) {
    Set<Long> solvedChallengeIds = solves.findChallengeIdsByUserId(admin.getId());
    var missingSolves =
        challenges.findByActiveTrueOrderByIdAsc().stream()
            .filter(challenge -> !solvedChallengeIds.contains(challenge.getId()))
            .map(challenge -> adminSolve(admin, challenge))
            .toList();
    if (!missingSolves.isEmpty()) solves.saveAll(missingSolves);
  }

  private static Solve adminSolve(User user, Challenge challenge) {
    Solve solve = new Solve();
    solve.setUser(user);
    solve.setChallenge(challenge);
    return solve;
  }
}
