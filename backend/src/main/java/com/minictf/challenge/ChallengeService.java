package com.minictf.challenge;

import com.minictf.common.RateLimitService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ChallengeService {
  private static final long MAX_ARTIFACT_SIZE = 25L * 1024 * 1024;
  private static final Set<String> ALLOWED_ARTIFACT_EXTENSIONS =
      Set.of("zip", "jpg", "jpeg", "png", "pcap", "txt", "log", "bin");
  private final ChallengeRepository challenges;
  private final UserRepository users;
  private final SubmissionRepository submissions;
  private final SubmissionRecorder recorder;
  private final SolveRepository solves;
  private final PasswordEncoder encoder;
  private final RateLimitService rateLimits;
  private final Path artifactRoot;

  public ChallengeService(
      ChallengeRepository challenges,
      UserRepository users,
      SubmissionRepository submissions,
      SubmissionRecorder recorder,
      SolveRepository solves,
      PasswordEncoder encoder,
      RateLimitService rateLimits,
      @Value("${app.artifact.storage-root}") String root) {
    this.challenges = challenges;
    this.users = users;
    this.submissions = submissions;
    this.recorder = recorder;
    this.solves = solves;
    this.encoder = encoder;
    this.rateLimits = rateLimits;
    this.artifactRoot = Paths.get(root).toAbsolutePath().normalize();
  }

  @Transactional(readOnly = true)
  public List<ChallengeDtos.Summary> list(String username) {
    Set<Long> solvedIds = solvedIds(username);
    return challenges.findByActiveTrueOrderByIdAsc().stream()
        .map(c -> summary(c, solvedIds.contains(c.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public ChallengeDtos.Detail detail(Long id, String username) {
    Challenge c = getActive(id);
    Set<Long> solvedIds = solvedIds(username);
    return new ChallengeDtos.Detail(
        c.getId(),
        c.getTitle(),
        c.getDescription(),
        c.getCategory(),
        c.getDifficulty(),
        c.getScore(),
        solvedIds.contains(id),
        hasArtifact(c));
  }

  @Transactional
  public ChallengeDtos.SubmitResult submit(Long id, String username, String flag, String ip) {
    Challenge c = getActive(id);
    User initialUser = users.findByUsernameIgnoreCase(username).orElseThrow();
    rateLimits.check("flag", initialUser.getId() + ":" + ip + ":" + id, 20, 60);
    if (!encoder.matches(flag, c.getFlagHash())) {
      recorder.record(initialUser.getId(), c.getId(), false);
      throw new InvalidFlagException();
    }
    User u = users.findByUsernameForUpdate(username).orElseThrow();
    if (solves.findByUserAndChallenge(u.getId(), id).isPresent()) {
      recordInCurrentTransaction(u, c, true);
      return new ChallengeDtos.SubmitResult("already_solved", 0);
    }
    recordInCurrentTransaction(u, c, true);
    Solve solve = new Solve();
    solve.setUser(u);
    solve.setChallenge(c);
    solves.save(solve);
    u.setScore(u.getScore() + c.getScore());
    return new ChallengeDtos.SubmitResult("correct", c.getScore());
  }

  @Transactional
  public ChallengeDtos.AdminView create(ChallengeDtos.AdminRequest r) {
    if (r.flag() == null || r.flag().isBlank())
      throw new IllegalArgumentException("Flag is required");
    Challenge c = new Challenge();
    apply(c, r, true);
    return adminView(challenges.save(c));
  }

  @Transactional
  public ChallengeDtos.AdminView update(Long id, ChallengeDtos.AdminRequest r) {
    Challenge c = get(id);
    apply(c, r, false);
    return adminView(challenges.save(c));
  }

  @Transactional
  public void delete(Long id) {
    Challenge c = get(id);
    c.setActive(false);
  }

  @Transactional(readOnly = true)
  public List<ChallengeDtos.AdminView> adminList() {
    return challenges.findAll().stream().map(this::adminView).toList();
  }

  @Transactional(readOnly = true)
  public ChallengeDtos.AdminView adminDetail(Long id) {
    return adminView(get(id));
  }

  @Transactional
  public ChallengeDtos.ArtifactView uploadArtifact(Long id, MultipartFile upload) {
    Challenge c = get(id);
    if (upload == null || upload.isEmpty() || upload.getSize() > MAX_ARTIFACT_SIZE)
      throw new IllegalArgumentException("Invalid artifact size");
    String original = upload.getOriginalFilename();
    if (original == null) throw new IllegalArgumentException("Artifact filename is required");
    String safeName = Paths.get(original).getFileName().toString();
    int dot = safeName.lastIndexOf('.');
    if (dot < 1 || dot == safeName.length() - 1)
      throw new IllegalArgumentException("Artifact extension is required");
    String extension = safeName.substring(dot + 1).toLowerCase(Locale.ROOT);
    if (!ALLOWED_ARTIFACT_EXTENSIONS.contains(extension))
      throw new IllegalArgumentException("Artifact extension is not allowed");
    String relative = "uploads/" + id + "/" + UUID.randomUUID() + "." + extension;
    Path target = artifactRoot.resolve(relative).normalize();
    if (!target.startsWith(artifactRoot))
      throw new IllegalArgumentException("Invalid artifact path");
    try {
      Files.createDirectories(target.getParent());
      try (var input = upload.getInputStream()) {
        Files.copy(input, target);
      }
      removeManagedArtifact(c);
      c.setArtifactPath(relative);
      return new ChallengeDtos.ArtifactView(target.getFileName().toString(), Files.size(target));
    } catch (IOException ex) {
      throw new ArtifactStorageException(ex);
    }
  }

  @Transactional
  public void deleteArtifact(Long id) {
    Challenge c = get(id);
    removeManagedArtifact(c);
    c.setArtifactPath(null);
  }

  public Path artifact(Long id) {
    Challenge c = getActive(id);
    if (c.getArtifactPath() == null || c.getArtifactPath().isBlank())
      throw new EntityNotFoundException("Artifact not found");
    Path file = artifactRoot.resolve(c.getArtifactPath()).normalize();
    if (!file.startsWith(artifactRoot) || !Files.isRegularFile(file))
      throw new EntityNotFoundException("Artifact not found");
    return file;
  }

  private void apply(Challenge c, ChallengeDtos.AdminRequest r, boolean creating) {
    c.setTitle(r.title().trim());
    c.setDescription(r.description().trim());
    c.setCategory(r.category().toUpperCase(Locale.ROOT));
    c.setDifficulty(r.difficulty().toUpperCase(Locale.ROOT));
    c.setScore(r.score());
    if (creating || (r.flag() != null && !r.flag().isBlank()))
      c.setFlagHash(encoder.encode(r.flag()));
    c.setArtifactPath(normalizeArtifactPath(r.artifactPath()));
    c.setActive(r.active());
  }

  private String normalizeArtifactPath(String value) {
    if (value == null || value.isBlank()) return null;
    Path relative = Paths.get(value.trim()).normalize();
    if (relative.isAbsolute() || relative.startsWith(".."))
      throw new IllegalArgumentException("Invalid artifact path");
    return relative.toString().replace('\\', '/');
  }

  private void removeManagedArtifact(Challenge c) {
    String relative = c.getArtifactPath();
    if (relative == null || !relative.startsWith("uploads/" + c.getId() + "/")) return;
    Path existing = artifactRoot.resolve(relative).normalize();
    if (!existing.startsWith(artifactRoot)) return;
    try {
      Files.deleteIfExists(existing);
    } catch (IOException ex) {
      throw new ArtifactStorageException(ex);
    }
  }

  private Challenge get(Long id) {
    return challenges
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Challenge not found"));
  }

  private Challenge getActive(Long id) {
    Challenge c = get(id);
    if (!c.isActive()) throw new EntityNotFoundException("Challenge not found");
    return c;
  }

  private Set<Long> solvedIds(String username) {
    if (username == null) return Set.of();
    return users
        .findByUsernameIgnoreCase(username)
        .map(u -> solves.findChallengeIdsByUserId(u.getId()))
        .orElseGet(Set::of);
  }

  private boolean hasArtifact(Challenge c) {
    return c.getArtifactPath() != null && !c.getArtifactPath().isBlank();
  }

  private ChallengeDtos.Summary summary(Challenge c, boolean solved) {
    return new ChallengeDtos.Summary(
        c.getId(),
        c.getTitle(),
        c.getCategory(),
        c.getDifficulty(),
        c.getScore(),
        solved,
        hasArtifact(c));
  }

  private ChallengeDtos.AdminView adminView(Challenge c) {
    return new ChallengeDtos.AdminView(
        c.getId(),
        c.getTitle(),
        c.getDescription(),
        c.getCategory(),
        c.getDifficulty(),
        c.getScore(),
        c.getArtifactPath(),
        c.isActive(),
        c.getFlagHash() != null,
        c.getCreatedAt(),
        c.getUpdatedAt());
  }

  private void recordInCurrentTransaction(User user, Challenge challenge, boolean correct) {
    Submission submission = new Submission();
    submission.setUser(user);
    submission.setChallenge(challenge);
    submission.setCorrect(correct);
    submissions.save(submission);
  }

  public static class InvalidFlagException extends RuntimeException {}

  public static class ArtifactStorageException extends RuntimeException {
    ArtifactStorageException(IOException cause) {
      super(cause);
    }
  }
}
