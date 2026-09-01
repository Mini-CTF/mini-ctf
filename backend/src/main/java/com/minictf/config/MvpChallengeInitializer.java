package com.minictf.config;

import com.minictf.challenge.ChallengeDtos;
import com.minictf.challenge.ChallengeRepository;
import com.minictf.challenge.ChallengeService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("!test")
public class MvpChallengeInitializer {
  @Bean
  @Order(10)
  CommandLineRunner seedMvpChallenges(
      ChallengeRepository challenges,
      ChallengeService service,
      PasswordEncoder encoder,
      @Value("${app.artifact.storage-root}") String storageRoot) {
    return args -> {
      Path root = Path.of(storageRoot).toAbsolutePath().normalize();
      Path mvpRoot = root.resolve("mvp").normalize();
      if (!mvpRoot.startsWith(root)) throw new IllegalStateException("Invalid MVP artifact path");
      Files.createDirectories(mvpRoot);
      boolean hasFlagStore = Files.isRegularFile(root.resolve(".mvp-flags.properties"));
      Properties flags = loadOrCreateFlags(root);
      if (!hasFlagStore && hasPersistedMvpArtifacts(challenges)) {
        reconcilePersistedSignalFlag(challenges, encoder);
        return;
      }

      seed(
          challenges,
          service,
          "Signal in Plain Sight",
          "REVERSING",
          "BEGINNER",
          50,
          "A captured status message looks ordinary, but its alphabet only uses Base64 characters. Decode the payload and submit the recovered FLAG.",
          flags.getProperty("easy"),
          "mvp/signal.txt",
          encoder);
      seed(
          challenges,
          service,
          "Proxy Afterimage",
          "FORENSIC",
          "EASY",
          150,
          "Review the supplied proxy trace. The analyst preserved one suspicious request in hex. Follow the transformation hints in the artifact to recover the FLAG.",
          flags.getProperty("medium"),
          "mvp/proxy-afterimage.log",
          encoder);
      seed(
          challenges,
          service,
          "Orbit Gatekeeper",
          "REVERSING",
          "NORMAL",
          300,
          "A small offline verifier checks a passphrase before opening a maintenance gate. Reverse its deterministic transform and recover the accepted FLAG. No network target is involved.",
          flags.getProperty("hard"),
          "mvp/orbit-gatekeeper.zip",
          encoder);
      seed(
          challenges,
          service,
          "Header Hunt",
          "WEB",
          "ADVANCED",
          600,
          "Inspect a safe practice response and identify the one header value that contains the encoded FLAG. No live target is involved.",
          flags.getProperty("advanced"),
          "mvp/header-hunt.txt",
          encoder);
      seed(
          challenges,
          service,
          "Layered Evidence",
          "FORENSIC",
          "EXPERT",
          1000,
          "A training evidence note has been encoded in several familiar layers. Record each transformation and recover the final FLAG.",
          flags.getProperty("expert"),
          "mvp/layered-evidence.txt",
          encoder);

      Files.writeString(
          mvpRoot.resolve("signal.txt"),
          "MINI-CTF TRAINING CAPTURE #001\n\nPayload:\n"
              + Base64.getEncoder()
                  .encodeToString(flags.getProperty("easy").getBytes(StandardCharsets.UTF_8))
              + "\n\nHint: This is encoding, not encryption.\n",
          StandardCharsets.UTF_8);
      String medium =
          Base64.getEncoder()
              .encodeToString(flags.getProperty("medium").getBytes(StandardCharsets.UTF_8));
      Files.writeString(
          mvpRoot.resolve("proxy-afterimage.log"),
          "2026-08-21T12:16:02Z 10.0.0.24 GET /health 200\n"
              + "2026-08-21T12:16:11Z 10.0.0.24 GET /assets/logo.svg 200\n"
              + "2026-08-21T12:16:28Z 10.0.0.99 GET /legacy/export?trace="
              + HexFormat.of().formatHex(medium.getBytes(StandardCharsets.UTF_8))
              + " 302\n\n"
              + "Analyst note: decode the trace from hexadecimal first; the resulting text has one more familiar layer.\n",
          StandardCharsets.UTF_8);
      writeVerifier(mvpRoot.resolve("orbit-gatekeeper.zip"), flags.getProperty("hard"));
      Files.writeString(
          mvpRoot.resolve("header-hunt.txt"),
          "HTTP/1.1 200 OK\nServer: FlagBox Practice\nX-Training-Note: Read headers carefully\nX-Flag-Fragment: "
              + Base64.getEncoder()
                  .encodeToString(flags.getProperty("advanced").getBytes(StandardCharsets.UTF_8))
              + "\n\nThis is a static training capture, not a live service.\n",
          StandardCharsets.UTF_8);
      Files.writeString(
          mvpRoot.resolve("layered-evidence.txt"),
          Base64.getEncoder()
              .encodeToString(
                  HexFormat.of()
                      .formatHex(flags.getProperty("expert").getBytes(StandardCharsets.UTF_8))
                      .getBytes(StandardCharsets.UTF_8)),
          StandardCharsets.UTF_8);
      persistMvpArtifacts(challenges, mvpRoot);
    };
  }

  /**
   * Render처럼 로컬 디스크가 초기화될 수 있는 환경에서도 MVP 문제의 파일과 정답 해시가
   * 서로 어긋나지 않도록 생성된 파일을 DB에 보관한다.
   */
  private static void persistMvpArtifacts(ChallengeRepository challenges, Path mvpRoot)
      throws IOException {
    List<String> titles =
        List.of(
            "Signal in Plain Sight",
            "Proxy Afterimage",
            "Orbit Gatekeeper",
            "Header Hunt",
            "Layered Evidence");
    List<String> paths =
        List.of(
            "signal.txt",
            "proxy-afterimage.log",
            "orbit-gatekeeper.zip",
            "header-hunt.txt",
            "layered-evidence.txt");
    for (int i = 0; i < titles.size(); i++) {
      var challenge = challenges.findByTitle(titles.get(i)).orElse(null);
      Path artifact = mvpRoot.resolve(paths.get(i)).normalize();
      if (challenge == null || !artifact.startsWith(mvpRoot) || !Files.isRegularFile(artifact)) {
        continue;
      }
      challenge.setArtifactData(Files.readAllBytes(artifact));
      challenges.save(challenge);
    }
    challenges.flush();
  }

  private static void seed(
      ChallengeRepository challenges,
      ChallengeService service,
      String title,
      String category,
      String difficulty,
      int score,
      String description,
      String flag,
      String artifactPath,
      PasswordEncoder encoder) {
    var existing = challenges.findByTitle(title).orElse(null);
    if (existing != null) {
      if (!encoder.matches(flag, existing.getFlagHash())) {
        existing.setFlagHash(encoder.encode(flag));
        challenges.save(existing);
      }
      return;
    }
    service.create(
        new ChallengeDtos.AdminRequest(
            title, description, category, difficulty, score, flag, artifactPath, true));
  }

  private static Properties loadOrCreateFlags(Path root) throws IOException {
    Path file = root.resolve(".mvp-flags.properties").normalize();
    if (!file.startsWith(root)) throw new IllegalStateException("Invalid MVP flag path");
    Properties flags = new Properties();
    if (Files.isRegularFile(file)) {
      try (var input = Files.newInputStream(file)) {
        flags.load(input);
      }
    }
    for (String level : List.of("easy", "medium", "hard", "advanced", "expert")) {
      flags.putIfAbsent(level, "CTF{" + level + "_" + randomToken() + "}");
    }
    try (var output = Files.newOutputStream(file)) {
      flags.store(output, "Keep this file private: it contains the seeded MVP flags.");
    }
    return flags;
  }

  private static String randomToken() {
    byte[] bytes = new byte[12];
    new SecureRandom().nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  private static boolean hasPersistedMvpArtifacts(ChallengeRepository challenges) {
    return List.of(
            "Signal in Plain Sight",
            "Proxy Afterimage",
            "Orbit Gatekeeper",
            "Header Hunt",
            "Layered Evidence")
        .stream()
        .map(challenges::findByTitle)
        .allMatch(challenge -> challenge.isPresent() && challenge.get().getArtifactData() != null);
  }

  /**
   * If Render loses the local flag properties file, keep the database-backed artifact and repair
   * the verifier from that same artifact instead of accepting a stale hash.
   */
  private static void reconcilePersistedSignalFlag(
      ChallengeRepository challenges, PasswordEncoder encoder) {
    var challenge = challenges.findByTitle("Signal in Plain Sight").orElse(null);
    if (challenge == null || challenge.getArtifactData() == null) return;

    String artifact = new String(challenge.getArtifactData(), StandardCharsets.UTF_8);
    Matcher matcher = Pattern.compile("(?m)^Payload:\\s*([A-Za-z0-9+/=]+)\\s*$")
        .matcher(artifact);
    if (!matcher.find()) return;

    try {
      String flag = new String(Base64.getDecoder().decode(matcher.group(1)), StandardCharsets.UTF_8);
      if (flag.startsWith("CTF{") && flag.endsWith("}")
          && !encoder.matches(flag, challenge.getFlagHash())) {
        challenge.setFlagHash(encoder.encode(flag));
        challenges.save(challenge);
        challenges.flush();
      }
    } catch (IllegalArgumentException ignored) {
      // Keep startup resilient if an administrator uploaded a non-standard artifact.
    }
  }

  private static void writeVerifier(Path zipPath, String flag) throws IOException {
    byte[] encoded = transform(flag.getBytes(StandardCharsets.UTF_8));
    String verifier =
        "# Offline MINI-CTF training verifier. No network calls are made.\n"
            + "expected = "
            + unsignedByteList(encoded)
            + "\nkey = b'orbit-9'\n\n"
            + "def transform(value):\n"
            + "    data = bytearray(value.encode())\n"
            + "    for round_no in range(3):\n"
            + "        for i in range(len(data)):\n"
            + "            data[i] = ((data[i] ^ key[(i + round_no) % len(key)]) + 17 + round_no) & 0xff\n"
            + "    return list(data)\n\n"
            + "candidate = input('FLAG> ')\n"
            + "print('accepted' if transform(candidate) == expected else 'denied')\n";
    try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(zipPath))) {
      zip.putNextEntry(new ZipEntry("gatekeeper.py"));
      zip.write(verifier.getBytes(StandardCharsets.UTF_8));
      zip.closeEntry();
      zip.putNextEntry(new ZipEntry("README.txt"));
      zip.write(
          "The verifier is intentionally offline. Recover the accepted CTF{...} input.\n"
              .getBytes(StandardCharsets.UTF_8));
      zip.closeEntry();
    }
  }

  private static byte[] transform(byte[] source) {
    byte[] data = source.clone();
    byte[] key = "orbit-9".getBytes(StandardCharsets.UTF_8);
    for (int round = 0; round < 3; round++) {
      for (int i = 0; i < data.length; i++) {
        data[i] = (byte) (((data[i] ^ key[(i + round) % key.length]) + 17 + round) & 0xff);
      }
    }
    return data;
  }

  private static String unsignedByteList(byte[] bytes) {
    StringBuilder output = new StringBuilder("[");
    for (int i = 0; i < bytes.length; i++) {
      if (i > 0) output.append(", ");
      output.append(Byte.toUnsignedInt(bytes[i]));
    }
    return output.append(']').toString();
  }
}
