package com.minictf.challenge;

import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class ChallengeService {
    private final ChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final SolveRepository solveRepository;
    private final PasswordEncoder passwordEncoder;
    private final Path artifactRoot;
    private final Map<String, Window> rateWindows = new ConcurrentHashMap<>();

    public ChallengeService(ChallengeRepository challengeRepository, UserRepository userRepository,
                            SubmissionRepository submissionRepository, SolveRepository solveRepository,
                            PasswordEncoder passwordEncoder, @Value("${app.artifact.storage-root}") String artifactRoot) {
        this.challengeRepository = challengeRepository;
        this.userRepository = userRepository;
        this.submissionRepository = submissionRepository;
        this.solveRepository = solveRepository;
        this.passwordEncoder = passwordEncoder;
        this.artifactRoot = Paths.get(artifactRoot).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<ChallengeDtos.Summary> list(String username) {
        User user = username == null ? null : userRepository.findByUsername(username).orElse(null);
        return challengeRepository.findByActiveTrueOrderByIdAsc().stream()
                .map(c -> new ChallengeDtos.Summary(c.getId(), c.getTitle(), c.getCategory(), c.getDifficulty(), c.getScore(), user != null && solveRepository.findByUserIdAndChallengeId(user.getId(), c.getId()).isPresent()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ChallengeDtos.Detail detail(Long id, String username) {
        Challenge c = challengeRepository.findById(id).filter(Challenge::isActive)
                .orElseThrow(() -> new EntityNotFoundException("Challenge를 찾을 수 없습니다."));
        boolean solved = username != null && userRepository.findByUsername(username)
                .flatMap(user -> solveRepository.findByUserIdAndChallengeId(user.getId(), id)).isPresent();
        return new ChallengeDtos.Detail(c.getId(), c.getTitle(), c.getDescription(), c.getCategory(), c.getDifficulty(), c.getScore(), c.isActive(), solved, c.getArtifactPath() != null);
    }

    @Transactional
    public ChallengeDtos.SubmitResult submit(Long id, String username, String ip, String flag) {
        User user = userRepository.findByUsername(username).orElseThrow();
        Challenge challenge = challengeRepository.findById(id).filter(Challenge::isActive)
                .orElseThrow(() -> new EntityNotFoundException("Challenge를 찾을 수 없습니다."));
        String rateKey = user.getId() + ":" + ip + ":" + id;
        if (!allow(rateKey)) throw new RateLimitedException();
        if (solveRepository.findByUserIdAndChallengeId(user.getId(), id).isPresent()) {
            return new ChallengeDtos.SubmitResult("already_solved", 0);
        }
        boolean correct = passwordEncoder.matches(flag, challenge.getFlagHash());
        Submission submission = new Submission();
        submission.setUser(user);
        submission.setChallenge(challenge);
        submission.setCorrect(correct);
        submissionRepository.save(submission);
        if (!correct) throw new InvalidFlagException();
        try {
            Solve solve = new Solve();
            solve.setUser(user);
            solve.setChallenge(challenge);
            solveRepository.saveAndFlush(solve);
            user.setScore(user.getScore() + challenge.getScore());
            userRepository.save(user);
            return new ChallengeDtos.SubmitResult("correct", challenge.getScore());
        } catch (DataIntegrityViolationException ignored) {
            return new ChallengeDtos.SubmitResult("already_solved", 0);
        }
    }

    public Resource artifact(Long id) {
        Challenge c = challengeRepository.findById(id).filter(Challenge::isActive)
                .orElseThrow(() -> new EntityNotFoundException("Challenge를 찾을 수 없습니다."));
        if (c.getArtifactPath() == null || c.getArtifactPath().isBlank()) throw new EntityNotFoundException("Artifact가 없습니다.");
        try {
            Path file = artifactRoot.resolve(c.getArtifactPath()).normalize();
            if (!file.startsWith(artifactRoot) || !Files.isRegularFile(file)) throw new EntityNotFoundException("Artifact가 없습니다.");
            return new UrlResource(file.toUri());
        } catch (Exception ex) {
            throw new EntityNotFoundException("Artifact가 없습니다.");
        }
    }

    @Transactional
    public Challenge create(ChallengeDtos.AdminRequest request) {
        Challenge c = new Challenge();
        update(c, request);
        return challengeRepository.save(c);
    }

    @Transactional
    public Challenge update(Long id, ChallengeDtos.AdminRequest request) {
        Challenge c = challengeRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Challenge를 찾을 수 없습니다."));
        update(c, request);
        return challengeRepository.save(c);
    }

    @Transactional
    public void delete(Long id) { challengeRepository.deleteById(id); }

    private void update(Challenge c, ChallengeDtos.AdminRequest request) {
        c.setTitle(request.title()); c.setDescription(request.description()); c.setCategory(request.category());
        c.setDifficulty(request.difficulty()); c.setScore(request.score()); c.setArtifactPath(request.artifactPath());
        c.setActive(request.active());
        if (request.flag() != null && !request.flag().isBlank()) c.setFlagHash(passwordEncoder.encode(request.flag()));
        if (c.getFlagHash() == null) throw new IllegalArgumentException("FLAG가 필요합니다.");
    }

    private boolean allow(String key) {
        long now = System.currentTimeMillis();
        Window current = rateWindows.compute(key, (ignored, old) -> old == null || now - old.startedAt > 60_000 ? new Window(now) : old);
        return current.count.incrementAndGet() <= 20;
    }

    private static final class Window {
        private final long startedAt;
        private final AtomicInteger count = new AtomicInteger();
        private Window(long startedAt) { this.startedAt = startedAt; }
    }

    public static class InvalidFlagException extends RuntimeException {}
    public static class RateLimitedException extends RuntimeException {}
}
