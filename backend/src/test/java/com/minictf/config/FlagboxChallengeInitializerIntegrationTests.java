package com.minictf.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.minictf.challenge.ChallengeRepository;
import com.minictf.challenge.ChallengeService;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:catalog_initializer;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.flyway.enabled=false",
      "app.jwt.secret=test-secret-test-secret-test-secret-test-secret",
      "app.artifact.storage-root=build/catalog-integration-artifacts",
      "app.artifact.backup-on-startup=false",
      "app.profile.storage-root=build/catalog-integration-profiles",
      "app.retention.enabled=false"
    })
@ActiveProfiles("catalog-integration")
class FlagboxChallengeInitializerIntegrationTests {
  @Autowired ChallengeRepository challenges;
  @Autowired ChallengeService challengeService;
  @Autowired PasswordEncoder encoder;
  @Autowired FlagboxChallengeInitializer initializer;

  @Test
  void startupPersistsEveryCatalogEntryWithItsArtifactAndMetadata() {
    assertThat(challenges.countByActiveTrue()).isEqualTo(280);
    for (FlagboxChallengeCatalog.Seed seed : FlagboxChallengeCatalog.SEEDS) {
      var challenge = challenges.findBySeedKey(seed.key()).orElseThrow();
      assertThat(challenge.getTitle()).isEqualTo(seed.title());
      assertThat(challenge.getCategory()).isEqualTo(seed.category());
      assertThat(challenge.getDifficulty()).isEqualTo(seed.difficulty());
      assertThat(challenge.getScore()).isEqualTo(seed.score());
      assertThat(challenge.getHintText()).isEqualTo(seed.hint());
      assertThat(challenge.getDescription()).isEqualTo(seed.description());
      assertThat(challenge.getArtifactData()).isNotEmpty();
      assertThat(challenge.getArtifactPath()).startsWith("flagbox/");
      if (seed.key().matches("[wfrcm]y\\d{2}")) {
        assertThat(challenge.getArtifactPath()).contains(seed.key());
      }
    }
  }

  @Test
  void startupUpgradesALegacyGeneratedArtifactEvenWhenTheOldFlagStoreIsMissing() throws Exception {
    Path root = Path.of("build/catalog-integration-artifacts").toAbsolutePath().normalize();
    Path flagsFile = root.resolve(".mvp-flags.properties");
    Files.deleteIfExists(flagsFile);

    var seed =
        FlagboxChallengeCatalog.SEEDS.stream()
            .filter(candidate -> candidate.key().equals("wy01"))
            .findFirst()
            .orElseThrow();
    var challenge = challenges.findBySeedKey(seed.key()).orElseThrow();
    challenge.setArtifactPath("flagbox/wx01-wx01.txt");
    challenge.setArtifactData("legacy-one-step-artifact".getBytes());
    challenges.saveAndFlush(challenge);

    initializer.seedFlagboxChallenges(challenges, challengeService, encoder, root.toString()).run();

    var upgraded = challenges.findBySeedKey(seed.key()).orElseThrow();
    assertThat(upgraded.getArtifactPath()).contains("flagbox/wy01-");
    assertThat(upgraded.getArtifactData()).isNotEqualTo("legacy-one-step-artifact".getBytes());
    Properties flags = new Properties();
    try (InputStream input = Files.newInputStream(flagsFile)) {
      flags.load(input);
    }
    assertThat(encoder.matches(flags.getProperty(seed.key()), upgraded.getFlagHash())).isTrue();
  }

  @Test
  void startupMatchesBySeedKeyWhenATitleChanges() throws Exception {
    Path root = Path.of("build/catalog-integration-artifacts").toAbsolutePath().normalize();
    var seed = FlagboxChallengeCatalog.SEEDS.getFirst();
    var challenge = challenges.findBySeedKey(seed.key()).orElseThrow();
    long id = challenge.getId();
    long count = challenges.count();
    challenge.setTitle("temporary legacy title");
    challenges.saveAndFlush(challenge);

    initializer.seedFlagboxChallenges(challenges, challengeService, encoder, root.toString()).run();

    assertThat(challenges.count()).isEqualTo(count);
    assertThat(challenges.findBySeedKey(seed.key()).orElseThrow().getId()).isEqualTo(id);
    assertThat(challenges.findBySeedKey(seed.key()).orElseThrow().getTitle())
        .isEqualTo(seed.title());
  }
}
