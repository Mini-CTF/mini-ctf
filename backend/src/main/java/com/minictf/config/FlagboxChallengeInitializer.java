package com.minictf.config;

import com.minictf.challenge.ChallengeDtos;
import com.minictf.challenge.ChallengeRepository;
import com.minictf.challenge.ChallengeService;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Properties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * FlagBox 워게임 60문제 시더.
 *
 * <p>{@link FlagboxChallengeCatalog}의 정의를 읽어 부팅 시점에 등록한다. 플래그는 {@code .mvp-flags.properties}에 실행별로
 * 저장되며 저장소(Git)에는 절대 커밋하지 않는다. 같은 제목의 문제가 이미 있으면 건너뛰므로 재시작해도 중복되지 않는다.
 */
@Configuration
@Profile("!test")
public class FlagboxChallengeInitializer {

  @Bean
  CommandLineRunner seedFlagboxChallenges(
      ChallengeRepository challenges,
      ChallengeService service,
      @Value("${app.artifact.storage-root}") String storageRoot) {
    return args -> {
      Path root = Path.of(storageRoot).toAbsolutePath().normalize();
      Path artifactDir = root.resolve("flagbox").normalize();
      if (!artifactDir.startsWith(root)) {
        throw new IllegalStateException("Invalid flagbox artifact path");
      }
      Files.createDirectories(artifactDir);
      Properties flags = loadFlags(root);

      for (FlagboxChallengeCatalog.Seed seed : FlagboxChallengeCatalog.SEEDS) {
        String flag = ensureFlag(flags, seed.key());
        var existing = challenges.findByTitle(seed.title()).orElse(null);
        if (existing != null) {
          syncExisting(existing, seed);
          challenges.save(existing);
          continue;
        }
        String artifactPath = null;
        if (seed.artifact() != null) {
          Path file = artifactDir.resolve(seed.key() + "-" + artifactName(seed));
          Files.write(file, seed.artifact().write(flag));
          artifactPath = root.relativize(file).toString().replace('\\', '/');
        }
        service.create(
            new ChallengeDtos.AdminRequest(
                seed.title(),
                seed.description().apply(flag),
                seed.category(),
                seed.difficulty(),
                seed.score(),
                flag,
                artifactPath,
                true));
      }
      saveFlags(root, flags);
    };
  }

  /** 카탈로그 정의가 바뀐 경우(난이도·점수 조정 등) 기존 행을 최신 정의로 맞춘다. */
  private static void syncExisting(
      com.minictf.challenge.Challenge existing, FlagboxChallengeCatalog.Seed seed) {
    boolean changed = false;
    if (!existing.getCategory().equals(seed.category())) {
      existing.setCategory(seed.category());
      changed = true;
    }
    if (!existing.getDifficulty().equals(seed.difficulty())) {
      existing.setDifficulty(seed.difficulty());
      changed = true;
    }
    if (existing.getScore() != seed.score()) {
      existing.setScore(seed.score());
      changed = true;
    }
  }

  private static String artifactName(FlagboxChallengeCatalog.Seed seed) {
    return switch (seed.key()) {
      case "w11" -> "access.log";
      case "w12" -> "hidden.js";
      case "f01" -> "mystery.bin";
      case "f11" -> "capture.txt";
      case "f14" -> "photo.bin";
      case "f15" -> "memdump.txt";
      case "f19" -> "hidden-note.txt";
      case "r03" -> "check.py";
      case "r12" -> "transform.py";
      case "r17" -> "gate.py";
      default -> "attachment.txt";
    };
  }

  private static Properties loadFlags(Path root) throws IOException {
    Path file = root.resolve(".mvp-flags.properties").normalize();
    if (!file.startsWith(root)) {
      throw new IllegalStateException("Invalid MVP flag path");
    }
    Properties flags = new Properties();
    if (Files.isRegularFile(file)) {
      try (InputStream input = Files.newInputStream(file)) {
        flags.load(input);
      }
    }
    return flags;
  }

  private static String ensureFlag(Properties flags, String key) {
    String existing = flags.getProperty(key);
    if (existing != null && !existing.isBlank()) {
      return existing;
    }
    byte[] token = new byte[12];
    new SecureRandom().nextBytes(token);
    String generated = "CTF{" + key + "_" + HexFormat.of().formatHex(token) + "}";
    flags.setProperty(key, generated);
    return generated;
  }

  private static void saveFlags(Path root, Properties flags) throws IOException {
    Path file = root.resolve(".mvp-flags.properties").normalize();
    try (OutputStream output = Files.newOutputStream(file)) {
      flags.store(output, "Keep this file private: it contains the seeded challenge flags.");
    }
  }
}
