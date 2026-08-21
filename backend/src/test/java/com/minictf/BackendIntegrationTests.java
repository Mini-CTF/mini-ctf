package com.minictf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.minictf.auth.JwtService;
import com.minictf.auth.OAuthAccountRepository;
import com.minictf.challenge.*;
import com.minictf.community.*;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="app.artifact.storage-root=build/test-artifacts")
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

    @BeforeEach
    void cleanDatabase() {
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
    void authenticationUsesSafeErrorsAndNeverStoresPlainPassword() throws Exception {
        String body = """
                {"username":"Student_1","nickname":"학생","password":"strong-password","passwordConfirmation":"strong-password"}
                """;
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty());

        User saved = users.findByUsernameIgnoreCase("student_1").orElseThrow();
        assertThat(saved.getPasswordHash()).isNotEqualTo("strong-password");
        assertThat(encoder.matches("strong-password", saved.getPasswordHash())).isTrue();

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body.replace("Student_1", "student_1")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("USERNAME_EXISTS"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"student_1\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void flagSubmissionPersistsIncorrectAttemptsAndAwardsOnlyOnce() throws Exception {
        User user = user("solver", "USER");
        Challenge challenge = challenge(true, "CTF{correct}");
        String token = jwt.createToken(user.getId(), user.getRole());

        mvc.perform(post("/api/challenges/{id}/submit", challenge.getId()).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"flag\":\"CTF{wrong}\"}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.error.code").value("INVALID_FLAG"));
        assertThat(submissions.count()).isEqualTo(1);

        mvc.perform(post("/api/challenges/{id}/submit", challenge.getId()).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"flag\":\"CTF{correct}\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.result").value("correct"))
                .andExpect(jsonPath("$.data.awardedScore").value(100));
        mvc.perform(post("/api/challenges/{id}/submit", challenge.getId()).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"flag\":\"CTF{correct}\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.result").value("already_solved"))
                .andExpect(jsonPath("$.data.awardedScore").value(0));

        assertThat(solves.count()).isEqualTo(1);
        assertThat(users.findById(user.getId()).orElseThrow().getScore()).isEqualTo(100);
        mvc.perform(get("/api/challenges").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].solved").value(true));
    }

    @Test
    void concurrentCorrectSubmissionsCannotDuplicateScore() throws Exception {
        User user = user("racer", "USER");
        Challenge challenge = challenge(true, "CTF{race}");
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<ChallengeDtos.SubmitResult> task = () -> { start.await(); return challengeService.submit(challenge.getId(), user.getUsername(), "CTF{race}", Thread.currentThread().getName()); };
        Future<ChallengeDtos.SubmitResult> first = pool.submit(task);
        Future<ChallengeDtos.SubmitResult> second = pool.submit(task);
        start.countDown();
        List<String> results = List.of(first.get(10, TimeUnit.SECONDS).result(), second.get(10, TimeUnit.SECONDS).result());
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
        mvc.perform(get("/api/admin/challenges").header("Authorization", bearer(jwt.createToken(normal.getId(), normal.getRole())))).andExpect(status().isForbidden());
        String response = mvc.perform(get("/api/admin/challenges").header("Authorization", bearer(jwt.createToken(admin.getId(), admin.getRole()))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("flagHash").doesNotContain("CTF{hidden}");
    }

    @Test
    void adminArtifactUploadIsValidatedAndDownloadable() throws Exception {
        User admin=user("artifact_admin","ADMIN");
        Challenge challenge=challenge(true,"CTF{artifact}");
        String token=jwt.createToken(admin.getId(),admin.getRole());
        MockMultipartFile forbidden=new MockMultipartFile("file","payload.exe","application/octet-stream",new byte[]{1,2});
        mvc.perform(multipart("/api/admin/challenges/{id}/artifact",challenge.getId()).file(forbidden).header("Authorization",bearer(token)))
                .andExpect(status().isBadRequest());

        MockMultipartFile allowed=new MockMultipartFile("file","evidence.txt","text/plain","artifact-data".getBytes());
        mvc.perform(multipart("/api/admin/challenges/{id}/artifact",challenge.getId()).file(allowed).header("Authorization",bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.sizeBytes").value(13));
        mvc.perform(get("/api/challenges/{id}/artifact",challenge.getId()).header("Authorization",bearer(token)))
                .andExpect(status().isOk()).andExpect(content().bytes("artifact-data".getBytes()))
                .andExpect(header().string("X-Content-Type-Options","nosniff"));
        mvc.perform(delete("/api/admin/challenges/{id}/artifact",challenge.getId()).header("Authorization",bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/challenges/{id}/artifact",challenge.getId()).header("Authorization",bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void solverDiscussionAndCommunityOwnershipAreEnforced() throws Exception {
        User author = user("author", "USER");
        User other = user("other", "USER");
        Challenge challenge = challenge(true, "CTF{discussion}");
        String authorToken = jwt.createToken(author.getId(), author.getRole());
        String otherToken = jwt.createToken(other.getId(), other.getRole());

        mvc.perform(get("/api/challenges/{id}/comments", challenge.getId()).param("discussionType", "SOLVER").header("Authorization", bearer(authorToken)))
                .andExpect(status().isForbidden());
        challengeService.submit(challenge.getId(), author.getUsername(), "CTF{discussion}", "test-solver");
        mvc.perform(post("/api/challenges/{id}/comments", challenge.getId()).header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"풀이 아이디어\",\"discussionType\":\"SOLVER\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.discussionType").value("SOLVER"));
        mvc.perform(get("/api/challenges/{id}/comments", challenge.getId()).param("discussionType", "SOLVER").header("Authorization", bearer(otherToken)))
                .andExpect(status().isForbidden());

        String created = mvc.perform(post("/api/community/posts").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"질문\",\"content\":\"내용\",\"category\":\"QUESTION\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long postId = json.readTree(created).path("data").path("id").asLong();
        mvc.perform(put("/api/community/posts/{id}", postId).header("Authorization", bearer(otherToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"탈취\",\"content\":\"내용\",\"category\":\"FREE\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/community/posts/{id}", postId)).andExpect(status().isOk()).andExpect(jsonPath("$.data.content").value("내용"));
    }

    private User user(String username,String role){User user=new User();user.setUsername(username);user.setNickname(username);user.setPasswordHash(encoder.encode("password-123"));user.setRole(role);user.setScore(0);return users.saveAndFlush(user);}
    private Challenge challenge(boolean active,String flag){Challenge challenge=new Challenge();challenge.setTitle("Challenge");challenge.setDescription("Description");challenge.setCategory("WEB");challenge.setDifficulty("EASY");challenge.setScore(100);challenge.setFlagHash(encoder.encode(flag));challenge.setActive(active);return challenges.saveAndFlush(challenge);}
    private String bearer(String token){return "Bearer "+token;}
}
