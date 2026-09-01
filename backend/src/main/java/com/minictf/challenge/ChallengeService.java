package com.minictf.challenge;

import com.minictf.anticheat.AntiCheatService;
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
  private final AntiCheatService antiCheat;
  private final Path artifactRoot;

  public ChallengeService(
      ChallengeRepository challenges,
      UserRepository users,
      SubmissionRepository submissions,
      SubmissionRecorder recorder,
      SolveRepository solves,
      PasswordEncoder encoder,
      RateLimitService rateLimits,
      AntiCheatService antiCheat,
      @Value("${app.artifact.storage-root}") String root) {
    this.challenges = challenges;
    this.users = users;
    this.submissions = submissions;
    this.recorder = recorder;
    this.solves = solves;
    this.encoder = encoder;
    this.rateLimits = rateLimits;
    this.antiCheat = antiCheat;
    this.artifactRoot = Paths.get(root).toAbsolutePath().normalize();
  }

  @Transactional(readOnly = true)
  public List<ChallengeDtos.Summary> list(String username) {
    Set<Long> solvedIds = solvedIds(username);
    return challenges.findByActiveTrueOrderByIdAsc().stream()
        .map(c -> summary(c, solvedIds.contains(c.getId()), solves.countByChallengeId(c.getId())))
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
        hasArtifact(c),
        c.getHintText() != null && !c.getHintText().isBlank(),
        c.getHintCost(),
        solves.countByChallengeId(id));
  }

  @Transactional
  public ChallengeDtos.HintView hint(Long id, String username) {
    Challenge c = getActive(id);
    User user = users.findByUsernameForUpdate(username).orElseThrow();
    if ("ADMIN".equals(user.getRole()))
      return new ChallengeDtos.HintView(hintText(c), Integer.MAX_VALUE);
    if (user.getHintCredits() < c.getHintCost())
      throw new IllegalArgumentException("Not enough hint credits");
    user.setHintCredits(user.getHintCredits() - c.getHintCost());
    return new ChallengeDtos.HintView(hintText(c), user.getHintCredits());
  }

  @Transactional
  public ChallengeDtos.SubmitResult submit(Long id, String username, String flag, String ip) {
    Challenge c = getActive(id);
    User initialUser = users.findByUsernameIgnoreCase(username).orElseThrow();
    rateLimits.check("flag", initialUser.getId() + ":" + ip + ":" + id, 20, 60);
    String normalizedFlag = flag == null ? "" : flag.trim();
    if (!encoder.matches(normalizedFlag, c.getFlagHash())) {
      recorder.record(initialUser.getId(), c.getId(), false);
      throw new InvalidFlagException();
    }
    User u = users.findByUsernameForUpdate(username).orElseThrow();
    if (solves.findByUserAndChallenge(u.getId(), id).isPresent()) {
      recordInCurrentTransaction(u, c, true);
      return new ChallengeDtos.SubmitResult("already_solved", 0, 0);
    }
    recordInCurrentTransaction(u, c, true);
    Solve solve = new Solve();
    solve.setUser(u);
    solve.setChallenge(c);
    solves.save(solve);
    u.setScore(u.getScore() + c.getScore());
    int awardedGems = gemsForDifficulty(c.getDifficulty());
    u.setCipherGems(u.getCipherGems() + awardedGems);
    antiCheat.assessCorrectSubmission(u, c);
    return new ChallengeDtos.SubmitResult("correct", c.getScore(), awardedGems);
  }

  @Transactional
  public void recordActivity(Long id, String username, String type, String ip) {
    if (username == null) return;
    Challenge c = getActive(id);
    User user = users.findByUsernameIgnoreCase(username).orElseThrow();
    rateLimits.check("challenge-activity", user.getId() + ":" + ip + ":" + id, 120, 60);
    antiCheat.recordActivity(user, c, type, ip);
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
      byte[] content = upload.getBytes();
      Files.createDirectories(target.getParent());
      Files.write(target, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
      removeManagedArtifact(c);
      c.setArtifactPath(relative);
      c.setArtifactData(content);
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
    c.setArtifactData(null);
  }

  public Path artifact(Long id) {
    Challenge c = getActive(id);
    if (c.getArtifactPath() == null || c.getArtifactPath().isBlank())
      throw new EntityNotFoundException("Artifact not found");
    Path file = artifactRoot.resolve(c.getArtifactPath()).normalize();
    if (!file.startsWith(artifactRoot)) throw new EntityNotFoundException("Artifact not found");
    if (!Files.isRegularFile(file) && c.getArtifactData() != null) {
      try {
        Files.createDirectories(file.getParent());
        Files.write(
            file,
            c.getArtifactData(),
            StandardOpenOption.CREATE,
            StandardOpenOption.TRUNCATE_EXISTING);
      } catch (IOException exception) {
        throw new ArtifactStorageException(exception);
      }
    }
    if (!Files.isRegularFile(file)) throw new EntityNotFoundException("Artifact not found");
    return file;
  }

  @Transactional
  public Path artifact(Long id, String username, String ip) {
    Path file = artifact(id);
    recordActivity(id, username, "ARTIFACT_DOWNLOADED", ip);
    return file;
  }

  private void apply(Challenge c, ChallengeDtos.AdminRequest r, boolean creating) {
    c.setTitle(r.title().trim());
    c.setDescription(r.description().trim());
    c.setCategory(r.category().toUpperCase(Locale.ROOT));
    c.setDifficulty(r.difficulty().toUpperCase(Locale.ROOT));
    c.setScore(r.score());
    if (creating || (r.flag() != null && !r.flag().isBlank()))
      c.setFlagHash(encoder.encode(r.flag().trim()));
    c.setArtifactPath(normalizeArtifactPath(r.artifactPath()));
    c.setHintText(r.hintText() == null || r.hintText().isBlank() ? null : r.hintText().trim());
    c.setHintCost(r.hintCost());
    c.setActive(r.active());
  }

  private String hintText(Challenge challenge) {
    if (challenge.getHintText() != null && !challenge.getHintText().isBlank())
      return challenge.getHintText();
    return switch (challenge.getCategory()) {
      case "FORENSIC" -> "Follow the suspicious request and decode each representation in order.";
      case "REVERSING" ->
          "Work backwards from the verifier's final comparison and undo one round at a time.";
      default ->
          "Use the challenge description as your first source of truth and isolate one clue at a time.";
    };
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

  private int gemsForDifficulty(String difficulty) {
    return switch (difficulty == null ? "" : difficulty.toUpperCase(Locale.ROOT)) {
      case "BEGINNER" -> 1;
      case "EASY" -> 3;
      case "NORMAL" -> 5;
      case "ADVANCED" -> 10;
      case "EXPERT" -> 30;
      default -> 0;
    };
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

  private ChallengeDtos.Summary summary(Challenge c, boolean solved, long solveCount) {
    return new ChallengeDtos.Summary(
        c.getId(),
        c.getTitle(),
        c.getCategory(),
        c.getDifficulty(),
        c.getScore(),
        solved,
        hasArtifact(c),
        solveCount);
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
