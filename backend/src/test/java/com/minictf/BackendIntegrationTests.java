package com.minictf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.minictf.admin.AdminDtos;
import com.minictf.admin.AdminModerationService;
import com.minictf.admin.SecurityEventRepository;
import com.minictf.anticheat.AntiCheatEventRepository;
import com.minictf.attendance.AttendanceCheckinRepository;
import com.minictf.auth.JwtService;
import com.minictf.auth.OAuthAccountRepository;
import com.minictf.challenge.*;
import com.minictf.community.*;
import com.minictf.social.DirectMessageRepository;
import com.minictf.social.FriendshipRepository;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import com.minictf.vault.VaultMissionCompletionRepository;
import com.minictf.vault.VaultOwnedCosmeticRepository;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "app.artifact.storage-root=build/test-artifacts")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackendIntegrationTests {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired UserRepository users;
  @Autowired ChallengeRepository challenges;
  @Autowired SubmissionRepository submissions;
  @Autowired SolveRepository solves;
  @Autowired OAuthAccountRepository oauthAccounts;
  @Autowired ChallengeCommentRepository challengeComments;
  @Autowired PostCommentRepository postComments;
  @Autowired PostRepository posts;
  @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt;
  @Autowired ChallengeService challengeService;
  @Autowired AntiCheatEventRepository antiCheatEvents;
  @Autowired SecurityEventRepository securityEvents;
  @Autowired AdminModerationService moderation;
  @Autowired FriendshipRepository friendships;
  @Autowired DirectMessageRepository directMessages;
  @Autowired AttendanceCheckinRepository attendanceCheckins;
  @Autowired VaultMissionCompletionRepository vaultMissionCompletions;
  @Autowired VaultOwnedCosmeticRepository vaultOwnedCosmetics;

  @BeforeEach
  void cleanDatabase() {
    securityEvents.deleteAll();
    vaultMissionCompletions.deleteAll();
    vaultOwnedCosmetics.deleteAll();
    attendanceCheckins.deleteAll();
    directMessages.deleteAll();
    friendships.deleteAll();
    challengeComments.deleteAll();
    postComments.deleteAll();
    posts.deleteAll();
    submissions.deleteAll();
    solves.deleteAll();
    oauthAccounts.deleteAll();
    challenges.deleteAll();
    users.deleteAll();
  }

  @Test
  void cipherVaultAwardsDailyRewardsAndLetsAdminsEquipEverything() throws Exception {
    mvc.perform(get("/api/vault")).andExpect(status().isUnauthorized());
    User learner = user("vault_learner", "USER");
    String learnerToken = jwt.createToken(learner.getId(), learner.getRole());
    mvc.perform(post("/api/attendance/check-in").header("Authorization", bearer(learnerToken)))
        .andExpect(status().isCreated());
    mvc.perform(
            post("/api/vault/missions/daily_checkin/claim")
                .header("Authorization", bearer(learnerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.gems").value(10));
    mvc.perform(
            post("/api/vault/missions/daily_checkin/claim")
                .header("Authorization", bearer(learnerToken)))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/vault/discover").header("Authorization", bearer(learnerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.cosmetics[?(@.id == 'ghost_protocol')].owned").value(true));

    User admin = user("vault_admin", "ADMIN");
    String adminToken = jwt.createToken(admin.getId(), admin.getRole());
    mvc.perform(
            put("/api/vault/equip")
                .header("Authorization", bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"spectral_core\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.cosmetics[?(@.id == 'spectral_core')].equipped").value(true));
  }

  @Test
  void hiddenOperationUnlocksSecretSetAndHintCreditsAreConsumable() throws Exception {
    User learner = user("signal_runner", "USER");
    learner.setCipherGems(30);
    users.saveAndFlush(learner);
    Challenge challenge = challenge(true, "CTF{signal}");
    challenge.setHintText("Decode the payload before changing its representation.");
    challenge.setHintCost(1);
    challenges.saveAndFlush(challenge);
    String token = jwt.createToken(learner.getId(), learner.getRole());

    mvc.perform(post("/api/vault/hidden/discover").header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.unlocked").value(true));
    mvc.perform(
            post("/api/vault/hidden/missions/hidden_signal/claim")
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.missions[0].completed").value(true));
    mvc.perform(
            post("/api/vault/hidden/missions/hidden_pulse/claim")
                .header("Authorization", bearer(token)))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/attendance/check-in").header("Authorization", bearer(token)))
        .andExpect(status().isCreated());
    mvc.perform(
            post("/api/vault/hidden/missions/hidden_pulse/claim")
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk());
    challengeService.submit(challenge.getId(), learner.getUsername(), "CTF{signal}", "test-signal");
    mvc.perform(
            post("/api/vault/hidden/missions/hidden_breaker/claim")
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.rewarded").value(true))
        .andExpect(jsonPath("$.data.rewards[?(@.id == 'crimson_lock_frame')].owned").value(true))
        .andExpect(jsonPath("$.data.rewards[?(@.id == 'zero_day_title')].owned").value(true));

    mvc.perform(
            post("/api/vault/shop/buy")
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"hint_credit\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.hintCredits").value(1));
    mvc.perform(
            post("/api/challenges/{id}/hint", challenge.getId())
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.hint").value("Decode the payload before changing its representation."))
        .andExpect(jsonPath("$.data.remainingCredits").value(0));
    mvc.perform(
            post("/api/challenges/{id}/hint", challenge.getId())
                .header("Authorization", bearer(token)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void friendRequestAcceptAndUsernameNormalizationWorkEndToEnd() throws Exception {
    User alice = user("alice", "USER");
    User bob = user("bob_1", "USER");
    String aliceToken = jwt.createToken(alice.getId(), alice.getRole());
    String bobToken = jwt.createToken(bob.getId(), bob.getRole());

    mvc.perform(
            post("/api/social/friends/{username}", "@bob_1")
                .header("Authorization", bearer(aliceToken)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.username").value("bob_1"))
        .andExpect(jsonPath("$.data.relationshipStatus").value("PENDING"));

    mvc.perform(get("/api/social/friends").header("Authorization", bearer(bobToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].username").value("alice"))
        .andExpect(jsonPath("$.data[0].incomingRequest").value(true));

    mvc.perform(
            post("/api/social/friends/{username}/accept", "alice")
                .header("Authorization", bearer(bobToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.relationshipStatus").value("ACCEPTED"));

    mvc.perform(
            post("/api/social/friends/{username}", "not-valid!")
                .header("Authorization", bearer(aliceToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
  }

  @Test
  void authenticationUsesSafeErrorsAndNeverStoresPlainPassword() throws Exception {
    String body =
        """
                {"username":"Student_1","nickname":"","password":"strong-password","passwordConfirmation":"strong-password"}
                """;
    String uniqueUsername = "Student_" + System.nanoTime();
    body = body.replace("Student_1", uniqueUsername);
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.token").isNotEmpty());

    User saved = users.findByUsernameIgnoreCase(uniqueUsername).orElseThrow();
    assertThat(saved.getNickname()).isEqualTo(uniqueUsername);
    assertThat(saved.getPasswordHash()).isNotEqualTo("strong-password");
    assertThat(encoder.matches("strong-password", saved.getPasswordHash())).isTrue();

    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.replace(uniqueUsername, uniqueUsername.toLowerCase())))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error.code").value("USERNAME_EXISTS"));
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"%s\",\"password\":\"wrong-password\"}"
                        .formatted(uniqueUsername)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"  %s  \",\"password\":\"strong-password\"}"
                        .formatted(uniqueUsername.toLowerCase())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.user.username").value(uniqueUsername));
    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"username\":\"another_user\",\"nickname\":\"\",\"password\":\"strong-password\",\"passwordConfirmation\":\"different-password\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    mvc.perform(get("/api/users/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
  }

  @Test
  void flagSubmissionPersistsIncorrectAttemptsAndAwardsOnlyOnce() throws Exception {
    User user = user("solver", "USER");
    Challenge challenge = challenge(true, "CTF{correct}");
    String token = jwt.createToken(user.getId(), user.getRole());

    mvc.perform(
            post("/api/challenges/{id}/submit", challenge.getId())
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"flag\":\"CTF{wrong}\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.error.code").value("INVALID_FLAG"));
    assertThat(submissions.count()).isEqualTo(1);

    mvc.perform(
            post("/api/challenges/{id}/submit", challenge.getId())
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"flag\":\"CTF{correct}\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.result").value("correct"))
        .andExpect(jsonPath("$.data.awardedScore").value(100));
    mvc.perform(
            post("/api/challenges/{id}/submit", challenge.getId())
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"flag\":\"CTF{correct}\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.result").value("already_solved"))
        .andExpect(jsonPath("$.data.awardedScore").value(0));

    assertThat(solves.count()).isEqualTo(1);
    assertThat(users.findById(user.getId()).orElseThrow().getScore()).isEqualTo(100);
    mvc.perform(get("/api/challenges").header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].solved").value(true));
  }

  @Test
  void concurrentCorrectSubmissionsCannotDuplicateScore() throws Exception {
    User user = user("racer", "USER");
    Challenge challenge = challenge(true, "CTF{race}");
    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    Callable<ChallengeDtos.SubmitResult> task =
        () -> {
          start.await();
          return challengeService.submit(
              challenge.getId(), user.getUsername(), "CTF{race}", Thread.currentThread().getName());
        };
    Future<ChallengeDtos.SubmitResult> first = pool.submit(task);
    Future<ChallengeDtos.SubmitResult> second = pool.submit(task);
    start.countDown();
    List<String> results =
        List.of(
            first.get(10, TimeUnit.SECONDS).result(), second.get(10, TimeUnit.SECONDS).result());
    pool.shutdownNow();
    assertThat(results).containsExactlyInAnyOrder("correct", "already_solved");
    assertThat(solves.count()).isEqualTo(1);
    assertThat(users.findById(user.getId()).orElseThrow().getScore()).isEqualTo(100);
  }

  @Test
  void inactiveChallengesAndAdminDataAreProtected() throws Exception {
    User normal = user("normal", "USER");
    User admin = user("admin", "ADMIN");
    Challenge hidden = challenge(false, "CTF{hidden}");
    mvc.perform(get("/api/challenges/{id}", hidden.getId())).andExpect(status().isNotFound());
    mvc.perform(
            get("/api/admin/challenges")
                .header("Authorization", bearer(jwt.createToken(normal.getId(), normal.getRole()))))
        .andExpect(status().isForbidden());
    String response =
        mvc.perform(
                get("/api/admin/challenges")
                    .header(
                        "Authorization", bearer(jwt.createToken(admin.getId(), admin.getRole()))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(response).doesNotContain("flagHash").doesNotContain("CTF{hidden}");
  }

  @Test
  void adminArtifactUploadIsValidatedAndDownloadable() throws Exception {
    User admin = user("artifact_admin", "ADMIN");
    Challenge challenge = challenge(true, "CTF{artifact}");
    String token = jwt.createToken(admin.getId(), admin.getRole());
    MockMultipartFile forbidden =
        new MockMultipartFile("file", "payload.exe", "application/octet-stream", new byte[] {1, 2});
    mvc.perform(
            multipart("/api/admin/challenges/{id}/artifact", challenge.getId())
                .file(forbidden)
                .header("Authorization", bearer(token)))
        .andExpect(status().isBadRequest());

    MockMultipartFile allowed =
        new MockMultipartFile("file", "evidence.txt", "text/plain", "artifact-data".getBytes());
    mvc.perform(
            multipart("/api/admin/challenges/{id}/artifact", challenge.getId())
                .file(allowed)
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.sizeBytes").value(13));
    mvc.perform(
            get("/api/challenges/{id}/artifact", challenge.getId())
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(content().bytes("artifact-data".getBytes()))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    mvc.perform(
            delete("/api/admin/challenges/{id}/artifact", challenge.getId())
                .header("Authorization", bearer(token)))
        .andExpect(status().isNoContent());
    mvc.perform(
            get("/api/challenges/{id}/artifact", challenge.getId())
                .header("Authorization", bearer(token)))
        .andExpect(status().isNotFound());
  }

  @Test
  void solverDiscussionAndCommunityOwnershipAreEnforced() throws Exception {
    User author = user("author", "USER");
    User other = user("other", "USER");
    Challenge challenge = challenge(true, "CTF{discussion}");
    String authorToken = jwt.createToken(author.getId(), author.getRole());
    String otherToken = jwt.createToken(other.getId(), other.getRole());

    mvc.perform(
            get("/api/challenges/{id}/comments", challenge.getId())
                .param("discussionType", "SOLVER")
                .header("Authorization", bearer(authorToken)))
        .andExpect(status().isForbidden());
    challengeService.submit(
        challenge.getId(), author.getUsername(), "CTF{discussion}", "test-solver");
    mvc.perform(
            post("/api/challenges/{id}/comments", challenge.getId())
                .header("Authorization", bearer(authorToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"풀이 아이디어\",\"discussionType\":\"SOLVER\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.discussionType").value("SOLVER"));
    mvc.perform(
            get("/api/challenges/{id}/comments", challenge.getId())
                .param("discussionType", "SOLVER")
                .header("Authorization", bearer(otherToken)))
        .andExpect(status().isForbidden());

    String created =
        mvc.perform(
                post("/api/community/posts")
                    .header("Authorization", bearer(authorToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"질문\",\"content\":\"내용\",\"category\":\"QUESTION\"}"))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    long postId = json.readTree(created).path("data").path("id").asLong();
    mvc.perform(
            put("/api/community/posts/{id}", postId)
                .header("Authorization", bearer(otherToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"탈취\",\"content\":\"내용\",\"category\":\"FREE\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/community/posts/{id}", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content").value("내용"));
  }

  @Test
  void adminCanSuspendAndReinstateUsersAndRapidSignalsRequireReview() throws Exception {
    User admin = user("moderator", "ADMIN");
    User learner = user("learner", "USER");
    Challenge challenge = challenge(true, "CTF{review}");
    String learnerToken = jwt.createToken(learner.getId(), learner.getRole());

    challengeService.submit(challenge.getId(), learner.getUsername(), "CTF{review}", "test-ip");
    assertThat(antiCheatEvents.findTop100ByOrderByCreatedAtDesc())
        .anyMatch(event -> event.getEventType().equals("SOLVE_WITHOUT_ACTIVITY"));

    moderation.suspend(
        learner.getId(), new AdminDtos.SuspensionRequest("Manual review"), admin.getUsername());
    assertThat(users.findById(learner.getId()).orElseThrow().getStatus()).isEqualTo("SUSPENDED");
    mvc.perform(get("/api/users/me").header("Authorization", bearer(learnerToken)))
        .andExpect(status().isUnauthorized());

    moderation.reinstate(learner.getId(), admin.getUsername());
    assertThat(users.findById(learner.getId()).orElseThrow().getStatus()).isEqualTo("ACTIVE");
    assertThat(moderation.logs()).anyMatch(log -> log.action().equals("REINSTATE_USER"));
  }

  private User user(String username, String role) {
    User user = new User();
    user.setUsername(username);
    user.setNickname(username);
    user.setPasswordHash(encoder.encode("password-123"));
    user.setRole(role);
    user.setScore(0);
    return users.saveAndFlush(user);
  }

  private Challenge challenge(boolean active, String flag) {
    Challenge challenge = new Challenge();
    challenge.setTitle("Challenge");
    challenge.setDescription("Description");
    challenge.setCategory("WEB");
    challenge.setDifficulty("EASY");
    challenge.setScore(100);
    challenge.setFlagHash(encoder.encode(flag));
    challenge.setActive(active);
    return challenges.saveAndFlush(challenge);
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }
}
