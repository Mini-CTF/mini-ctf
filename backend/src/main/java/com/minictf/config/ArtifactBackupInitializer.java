package com.minictf.config;

import com.minictf.challenge.Challenge;
import com.minictf.challenge.ChallengeRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;

/** Keeps generated and uploaded training files available after an ephemeral-host restart. */
@Configuration
@Profile("!test")
public class ArtifactBackupInitializer {
  @Bean
  @Order(100)
  CommandLineRunner backUpChallengeArtifacts(
      ChallengeRepository challenges, @Value("${app.artifact.storage-root}") String storageRoot) {
    return args -> {
      Path root = Path.of(storageRoot).toAbsolutePath().normalize();
      for (Challenge challenge : challenges.findAll()) {
        String relative = challenge.getArtifactPath();
        if (relative == null || relative.isBlank()) continue;
        Path file = root.resolve(relative).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) continue;
        byte[] content = Files.readAllBytes(file);
        if (!Arrays.equals(content, challenge.getArtifactData())) {
          challenge.setArtifactData(content);
          challenges.save(challenge);
        }
      }
    };
  }
}
