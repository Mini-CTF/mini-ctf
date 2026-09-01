package com.minictf.learning;

import com.minictf.challenge.Challenge;
import com.minictf.challenge.ChallengeRepository;
import com.minictf.challenge.Solve;
import com.minictf.challenge.SolveRepository;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningService {
  private final UserRepository users;
  private final ChallengeRepository challenges;
  private final SolveRepository solves;
  private final ChallengeBookmarkRepository bookmarks;
  private final LearningGoalRepository goals;
  private final ChallengeLikeRepository likes;

  public LearningService(
      UserRepository users,
      ChallengeRepository challenges,
      SolveRepository solves,
      ChallengeBookmarkRepository bookmarks,
      LearningGoalRepository goals,
      ChallengeLikeRepository likes) {
    this.users = users;
    this.challenges = challenges;
    this.solves = solves;
    this.bookmarks = bookmarks;
    this.goals = goals;
    this.likes = likes;
  }

  @Transactional(readOnly = true)
  public LearningDtos.Overview overview(String username) {
    User user = user(username);
    List<Solve> allSolves = solves.findByUserId(user.getId());
    Instant weekStart =
        LocalDate.now(ZoneOffset.UTC)
            .with(DayOfWeek.MONDAY)
            .atStartOfDay(ZoneOffset.UTC)
            .toInstant();
    int weeklySolved =
        (int) allSolves.stream().filter(solve -> !solve.getSolvedAt().isBefore(weekStart)).count();
    int target = goals.findByUserId(user.getId()).map(LearningGoal::getWeeklySolveTarget).orElse(3);
    List<LearningDtos.RecentSolve> recent =
        allSolves.stream()
            .limit(5)
            .map(
                solve ->
                    new LearningDtos.RecentSolve(
                        solve.getChallengeId(),
                        solve.getChallengeTitle(),
                        solve.getChallenge().getCategory(),
                        solve.getSolvedAt()))
            .toList();
    return new LearningDtos.Overview(
        target,
        weeklySolved,
        allSolves.size(),
        (int) bookmarks.countByUserId(user.getId()),
        recent,
        achievements(allSolves.size(), weeklySolved, target));
  }

  @Transactional(readOnly = true)
  public List<LearningDtos.Bookmark> bookmarks(String username) {
    User user = user(username);
    Set<Long> solvedIds = solves.findChallengeIdsByUserId(user.getId());
    return bookmarks.findAllForUser(user.getId()).stream()
        .map(
            bookmark -> {
              Challenge challenge = bookmark.getChallenge();
              return new LearningDtos.Bookmark(
                  challenge.getId(),
                  challenge.getTitle(),
                  challenge.getCategory(),
                  challenge.getDifficulty(),
                  challenge.getScore(),
                  solvedIds.contains(challenge.getId()),
                  bookmark.getCreatedAt());
            })
        .toList();
  }

  @Transactional
  public void bookmark(String username, Long challengeId) {
    User user = user(username);
    Challenge challenge =
        challenges
            .findById(challengeId)
            .orElseThrow(() -> new EntityNotFoundException("Challenge not found"));
    if (!challenge.isActive()) throw new EntityNotFoundException("Challenge not found");
    if (bookmarks.existsByUserIdAndChallengeId(user.getId(), challengeId)) return;
    ChallengeBookmark bookmark = new ChallengeBookmark();
    bookmark.setUser(user);
    bookmark.setChallenge(challenge);
    bookmarks.save(bookmark);
  }

  @Transactional
  public void removeBookmark(String username, Long challengeId) {
    bookmarks.deleteByUserIdAndChallengeId(user(username).getId(), challengeId);
  }

  @Transactional
  public void like(String username, Long challengeId) {
    User user = user(username);
    Challenge challenge =
        challenges
            .findById(challengeId)
            .filter(Challenge::isActive)
            .orElseThrow(() -> new EntityNotFoundException("Challenge not found"));
    if (likes.existsByUserIdAndChallengeId(user.getId(), challengeId)) return;
    ChallengeLike entry = new ChallengeLike();
    entry.setUser(user);
    entry.setChallenge(challenge);
    likes.save(entry);
  }

  @Transactional
  public void removeLike(String username, Long challengeId) {
    likes.deleteByUserIdAndChallengeId(user(username).getId(), challengeId);
  }

  @Transactional(readOnly = true)
  public List<LearningDtos.PopularChallenge> popular(String username) {
    User user = user(username);
    List<Challenge> active = challenges.findByActiveTrueOrderByIdAsc();
    Set<Long> ids = active.stream().map(Challenge::getId).collect(java.util.stream.Collectors.toSet());
    Map<Long, Long> counts = new HashMap<>();
    if (!ids.isEmpty())
      for (Object[] row : likes.countByChallengeIds(ids))
        counts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
    Set<Long> solvedIds = solves.findChallengeIdsByUserId(user.getId());
    return active.stream()
        .filter(challenge -> counts.getOrDefault(challenge.getId(), 0L) >= 3)
        .sorted(
            Comparator.comparingLong((Challenge challenge) -> counts.get(challenge.getId()))
                .reversed()
                .thenComparing(Challenge::getId))
        .map(
            challenge ->
                new LearningDtos.PopularChallenge(
                    challenge.getId(),
                    challenge.getTitle(),
                    challenge.getCategory(),
                    challenge.getDifficulty(),
                    challenge.getScore(),
                    solvedIds.contains(challenge.getId()),
                    counts.get(challenge.getId())))
        .toList();
  }

  @Transactional
  public LearningDtos.Overview updateGoal(String username, int target) {
    User user = user(username);
    LearningGoal goal = goals.findByUserId(user.getId()).orElseGet(LearningGoal::new);
    goal.setUser(user);
    goal.setWeeklySolveTarget(target);
    goals.save(goal);
    return overview(username);
  }

  private User user(String username) {
    return users
        .findByUsernameIgnoreCase(username)
        .orElseThrow(() -> new EntityNotFoundException("User not found"));
  }

  private List<LearningDtos.Achievement> achievements(
      int totalSolved, int weeklySolved, int weeklyTarget) {
    List<LearningDtos.Achievement> result = new ArrayList<>();
    if (totalSolved >= 1)
      result.add(
          new LearningDtos.Achievement(
              "FIRST_FLAG", "First Flag", "Solved your first FlagBox challenge."));
    if (totalSolved >= 10)
      result.add(new LearningDtos.Achievement("TEN_SOLVES", "Tenacious", "Solved ten challenges."));
    if (weeklySolved >= weeklyTarget)
      result.add(
          new LearningDtos.Achievement(
              "WEEKLY_GOAL", "Weekly Focus", "Completed this week's learning goal."));
    return result;
  }
}
