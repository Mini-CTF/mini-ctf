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
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

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
  @Order(20)
  CommandLineRunner seedFlagboxChallenges(
      ChallengeRepository challenges,
      ChallengeService service,
      PasswordEncoder encoder,
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
        var existing = challenges.findByTitle(seed.title()).orElse(null);
        Path file = artifactDir.resolve(seed.key() + "-" + seed.fileName());
        String artifactPath = root.relativize(file).toString().replace('\\', '/');
        String storedFlag = flags.getProperty(seed.key());
        if (existing != null
            && (storedFlag == null || storedFlag.isBlank())
            && existing.getArtifactData() != null) {
          syncExisting(existing, seed, artifactPath, null, encoder);
          challenges.save(existing);
          continue;
        }

        String flag = ensureFlag(flags, seed.key());
        byte[] artifact = seed.artifact().write(flag);
        if (existing != null) {
          Files.write(file, artifact);
          existing.setArtifactData(artifact);
          syncExisting(existing, seed, artifactPath, flag, encoder);
          challenges.save(existing);
          continue;
        }
        Files.write(file, artifact);
        var created =
            service.create(
            new ChallengeDtos.AdminRequest(
                seed.title(),
                seed.description(),
                seed.category(),
                seed.difficulty(),
                seed.score(),
                flag,
                artifactPath,
                true,
                seed.hint(),
                1));
        var challenge = challenges.findById(created.id()).orElseThrow();
        challenge.setArtifactData(artifact);
        challenges.save(challenge);
      }
      saveFlags(root, flags);
    };
  }

  /** 카탈로그 정의가 바뀐 경우(난이도·점수·설명·힌트 조정) 기존 행을 최신 정의로 맞춘다. */
  private static void syncExisting(
      com.minictf.challenge.Challenge existing,
      FlagboxChallengeCatalog.Seed seed,
      String artifactPath,
      String flag,
      PasswordEncoder encoder) {
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
    if (!seed.hint().equals(existing.getHintText())) {
      existing.setHintText(seed.hint());
      changed = true;
    }
    if (!seed.description().equals(existing.getDescription())) {
      existing.setDescription(seed.description());
      changed = true;
    }
    if (!artifactPath.equals(existing.getArtifactPath())) {
      existing.setArtifactPath(artifactPath);
      changed = true;
    }
    // An ephemeral host can lose the local flag store. In that case, retain the database-backed
    // artifact and verifier instead of generating a different flag on every restart.
    if (flag != null && !encoder.matches(flag, existing.getFlagHash())) {
      existing.setFlagHash(encoder.encode(flag));
      changed = true;
    }
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
