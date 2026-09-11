package com.minictf.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class FlagboxChallengeCatalogTests {
  private static final String FLAG = "CTF{catalog_round_trip}";
  private static final String[] METHODS = {
    "Base64", "16진수", "문자 뒤집기", "ROT13", "HTML 엔터티", "XOR 7", "줄 끝 공백", "문자 코드"
  };

  @Test
  void catalogKeysAndTitlesAreUnique() {
    assertThat(FlagboxChallengeCatalog.SEEDS).hasSize(275);
    assertThat(new HashSet<>(FlagboxChallengeCatalog.SEEDS.stream().map(s -> s.key()).toList()))
        .hasSameSizeAs(FlagboxChallengeCatalog.SEEDS);
    Map<String, Long> titleCounts =
        FlagboxChallengeCatalog.SEEDS.stream()
            .collect(
                Collectors.groupingBy(FlagboxChallengeCatalog.Seed::title, Collectors.counting()));
    assertThat(titleCounts.entrySet().stream().filter(entry -> entry.getValue() > 1).toList())
        .isEmpty();
  }

  @Test
  void everySeedHasValidMetadataAndGeneratesANonEmptySafeSizedArtifact() {
    Set<String> categories = Set.of("WEB", "FORENSIC", "REVERSING", "CRYPTO", "MISC");
    Map<String, Integer> scores =
        Map.of("BEGINNER", 50, "EASY", 150, "NORMAL", 300, "ADVANCED", 600, "EXPERT", 1000);

    for (FlagboxChallengeCatalog.Seed seed : FlagboxChallengeCatalog.SEEDS) {
      assertThat(seed.key()).isNotBlank();
      assertThat(seed.title()).isNotBlank();
      assertThat(seed.description()).isNotBlank();
      assertThat(seed.hint()).isNotBlank();
      assertThat(seed.fileName()).doesNotContain("..", "/", "\\");
      assertThat(categories).contains(seed.category());
      assertThat(seed.score()).isEqualTo(scores.get(seed.difficulty()));
      assertThat(seed.artifact().write(FLAG)).isNotEmpty().hasSizeLessThan(25 * 1024 * 1024);
    }
  }

  @Test
  void expandedCatalogHasEveryCategoryAndDifficultyCombination() {
    List<FlagboxChallengeCatalog.Seed> expanded = expandedSeeds();
    assertThat(expanded).hasSize(175);

    Map<String, Map<String, Long>> counts =
        expanded.stream()
            .collect(
                Collectors.groupingBy(
                    FlagboxChallengeCatalog.Seed::category,
                    Collectors.groupingBy(
                        FlagboxChallengeCatalog.Seed::difficulty, Collectors.counting())));

    assertThat(counts.keySet())
        .containsExactlyInAnyOrder("WEB", "FORENSIC", "REVERSING", "CRYPTO", "MISC");
    for (Map<String, Long> levels : counts.values()) {
      assertThat(levels)
          .containsEntry("BEGINNER", 5L)
          .containsEntry("EASY", 10L)
          .containsEntry("NORMAL", 10L)
          .containsEntry("ADVANCED", 5L)
          .containsEntry("EXPERT", 5L);
    }
  }

  @Test
  void everyExpandedArtifactRoundTripsToItsFlag() {
    Set<String> categorySources = new HashSet<>();
    for (FlagboxChallengeCatalog.Seed seed : expandedSeeds()) {
      String artifact = new String(seed.artifact().write(FLAG), StandardCharsets.UTF_8);
      assertThat(artifact).doesNotContain("\\n");
      assertThat(seed.description()).doesNotContain(FLAG);
      assertThat(seed.hint()).doesNotContain(FLAG);
      categorySources.add(lineValue(artifact, "# source: "));
      assertThat(solve(seed, artifact)).as(seed.key() + " " + seed.title()).isEqualTo(FLAG);
    }
    assertThat(categorySources).hasSize(5);
  }

  @Test
  void expandedDifficultyChangesTheRequiredWorkInsteadOfOnlyTheScore() {
    for (FlagboxChallengeCatalog.Seed seed : expandedSeeds()) {
      String artifact = new String(seed.artifact().write(FLAG), StandardCharsets.UTF_8);
      switch (seed.difficulty()) {
        case "BEGINNER" -> assertThat(artifact).contains("# 필요한 변환:");
        case "EASY" -> assertThat(artifact).doesNotContain("# 필요한 변환:");
        case "NORMAL" -> assertThat(artifact).contains("observation =", "payload =");
        case "ADVANCED" -> assertThat(artifact).contains("verifier pseudocode", "expected");
        case "EXPERT" -> assertThat(artifact).containsAnyOf("x(n+1)", "tiny VM");
        default -> throw new AssertionError(seed.difficulty());
      }
    }
  }

  @Test
  void normalAndHigherArtifactsNeverExposeTheAnswerAsPlaintext() {
    List<String> leaking =
        FlagboxChallengeCatalog.SEEDS.stream()
            .filter(seed -> Set.of("NORMAL", "ADVANCED", "EXPERT").contains(seed.difficulty()))
            .filter(
                seed ->
                    new String(seed.artifact().write(FLAG), StandardCharsets.UTF_8).contains(FLAG))
            .map(seed -> seed.key() + ":" + seed.title())
            .toList();
    assertThat(leaking).isEmpty();
  }

  @Test
  void strengthenedCuratedArtifactsCanBeReversedToTheOriginalFlag() {
    assertThat(decodeBase64(lineValue(artifactFor("w20v2"), "APP_REAL_FLAG_B64="))).isEqualTo(FLAG);
    assertThat(decodeHex(lineValue(artifactFor("f16v2"), "approval_code_hex="))).isEqualTo(FLAG);
    assertThat(decodeBase64(reverse(lineValue(artifactFor("f20v2"), "residual_payload="))))
        .isEqualTo(FLAG);
    assertThat(solveAdvanced(0, artifactFor("m16v2"))).isEqualTo(FLAG);

    byte[] vmOutput = HexFormat.of().parseHex(lineValue(artifactFor("m20v2"), "REAL_TARGET="));
    for (int i = 0; i < vmOutput.length; i++) vmOutput[i] = (byte) (vmOutput[i] ^ 47);
    reverseBytes(vmOutput);
    for (int i = 0; i < vmOutput.length; i++) vmOutput[i] = (byte) (vmOutput[i] - 9);
    assertThat(new String(vmOutput, StandardCharsets.UTF_8)).isEqualTo(FLAG);
  }

  private static String artifactFor(String key) {
    return FlagboxChallengeCatalog.SEEDS.stream()
        .filter(seed -> seed.key().equals(key))
        .findFirst()
        .map(seed -> new String(seed.artifact().write(FLAG), StandardCharsets.UTF_8))
        .orElseThrow();
  }

  private static List<FlagboxChallengeCatalog.Seed> expandedSeeds() {
    return FlagboxChallengeCatalog.SEEDS.stream()
        .filter(seed -> seed.key().matches("[wfrcm]y\\d{2}"))
        .toList();
  }

  private static String solve(FlagboxChallengeCatalog.Seed seed, String artifact) {
    int number = Integer.parseInt(seed.key().substring(2));
    return switch (seed.difficulty()) {
      case "BEGINNER", "EASY" -> solveOneStep(METHODS[(number - 1) % METHODS.length], artifact);
      case "NORMAL" -> solveNormal(number - 16, artifact);
      case "ADVANCED" -> solveAdvanced(number - 26, artifact);
      case "EXPERT" -> solveExpert(number - 31, artifact);
      default -> throw new IllegalArgumentException("Unexpected difficulty " + seed.difficulty());
    };
  }

  private static String solveOneStep(String method, String artifact) {
    return switch (method) {
      case "Base64" -> decodeBase64(lineValue(artifact, "payload = "));
      case "16진수" -> decodeHex(lineValue(artifact, "payload_hex = "));
      case "문자 뒤집기" -> reverse(lineValue(artifact, "payload_reversed = "));
      case "ROT13" -> rot13(lineValue(artifact, "payload_rot13 = "));
      case "HTML 엔터티" -> decodeEntities(lineValue(artifact, "payload_entity = "));
      case "XOR 7" -> xorHex(lineValue(artifact, "payload_hex = "), "7");
      case "줄 끝 공백" -> decodeTrailingSpaces(artifact);
      default -> decodeCodes(lineValue(artifact, "character_codes = "));
    };
  }

  private static String solveNormal(int variant, String artifact) {
    String payload = lineValue(artifact, "payload = ");
    return switch (variant % 4) {
      case 0 -> decodeBase64(decodeHex(payload));
      case 1 -> decodeBase64(reverse(payload));
      case 2 -> rot13(decodeHex(payload));
      default -> reverse(decodeBase64(payload));
    };
  }

  private static String solveAdvanced(int variant, String artifact) {
    if (variant % 2 == 0) {
      byte[] bytes = HexFormat.of().parseHex(lineValue(artifact, "expected_hex = "));
      reverseBytes(bytes);
      for (int i = 0; i < bytes.length; i++) bytes[i] = (byte) (bytes[i] - i);
      return new String(bytes, StandardCharsets.UTF_8);
    }
    int[] values = parseInts(lineValue(artifact, "expected = "));
    byte[] key = "gate7".getBytes(StandardCharsets.UTF_8);
    for (int round = 1; round >= 0; round--) {
      for (int i = 0; i < values.length; i++) {
        values[i] = ((values[i] - 5 - round * 3) & 0xff) ^ key[(i + round) % key.length];
      }
    }
    return bytesToString(values);
  }

  private static String solveExpert(int variant, String artifact) {
    byte[] output =
        HexFormat.of()
            .parseHex(lineValue(artifact, variant % 2 == 0 ? "cipher_hex = " : "output = "));
    if (variant % 2 == 0) {
      long x = Long.parseLong(lineValue(artifact, "x0 = "));
      for (int i = 0; i < output.length; i++) {
        x = Math.floorMod(x * 1103515245L + 12345L, 67108864L);
        output[i] = (byte) (output[i] ^ (x % 256));
      }
    } else {
      int xorKey = 41 + variant;
      for (int i = 0; i < output.length; i++) output[i] = (byte) (output[i] ^ xorKey);
      reverseBytes(output);
      int addKey = 7 + variant;
      for (int i = 0; i < output.length; i++) output[i] = (byte) (output[i] - addKey);
    }
    return new String(output, StandardCharsets.UTF_8);
  }

  private static String lineValue(String artifact, String prefix) {
    return artifact
        .lines()
        .filter(line -> line.startsWith(prefix))
        .map(line -> line.substring(prefix.length()).trim())
        .findFirst()
        .orElseThrow(() -> new AssertionError("Missing line: " + prefix));
  }

  private static String decodeBase64(String value) {
    return new String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8);
  }

  private static String decodeHex(String value) {
    return new String(HexFormat.of().parseHex(value), StandardCharsets.UTF_8);
  }

  private static String xorHex(String value, String key) {
    byte[] bytes = HexFormat.of().parseHex(value);
    byte[] keys = key.getBytes(StandardCharsets.UTF_8);
    for (int i = 0; i < bytes.length; i++) bytes[i] = (byte) (bytes[i] ^ keys[i % keys.length]);
    return new String(bytes, StandardCharsets.UTF_8);
  }

  private static String decodeEntities(String value) {
    Matcher matcher = Pattern.compile("&#(\\d+);").matcher(value);
    StringBuilder decoded = new StringBuilder();
    while (matcher.find()) decoded.append((char) Integer.parseInt(matcher.group(1)));
    return decoded.toString();
  }

  private static String decodeCodes(String value) {
    return bytesToString(parseInts(value));
  }

  private static int[] parseInts(String value) {
    Matcher matcher = Pattern.compile("\\d+").matcher(value);
    List<Integer> numbers = new ArrayList<>();
    while (matcher.find()) numbers.add(Integer.parseInt(matcher.group()));
    return numbers.stream().mapToInt(Integer::intValue).toArray();
  }

  private static String decodeTrailingSpaces(String value) {
    StringBuilder decoded = new StringBuilder();
    for (String line : value.split("\\n", -1)) {
      int spaces = 0;
      for (int i = line.length() - 1; i >= 0 && line.charAt(i) == ' '; i--) spaces++;
      if (spaces > 0) decoded.append((char) spaces);
    }
    return decoded.toString();
  }

  private static String bytesToString(int[] values) {
    byte[] bytes = new byte[values.length];
    for (int i = 0; i < values.length; i++) bytes[i] = (byte) values[i];
    return new String(bytes, StandardCharsets.UTF_8);
  }

  private static String reverse(String value) {
    return new StringBuilder(value).reverse().toString();
  }

  private static void reverseBytes(byte[] bytes) {
    for (int left = 0, right = bytes.length - 1; left < right; left++, right--) {
      byte swap = bytes[left];
      bytes[left] = bytes[right];
      bytes[right] = swap;
    }
  }

  private static String rot13(String value) {
    StringBuilder result = new StringBuilder();
    for (char c : value.toCharArray()) {
      if (c >= 'a' && c <= 'z') result.append((char) ('a' + (c - 'a' + 13) % 26));
      else if (c >= 'A' && c <= 'Z') result.append((char) ('A' + (c - 'A' + 13) % 26));
      else result.append(c);
    }
    return result.toString();
  }
}
