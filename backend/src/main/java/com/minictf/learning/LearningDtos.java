package com.minictf.learning;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.List;

public final class LearningDtos {
  private LearningDtos() {}

  public record Overview(
      int weeklyTarget,
      int weeklySolved,
      int totalSolved,
      int bookmarkedCount,
      List<RecentSolve> recentSolves,
      List<Achievement> achievements) {}

  public record RecentSolve(Long challengeId, String title, String category, Instant solvedAt) {}

  public record Bookmark(
      Long challengeId,
      String title,
      String category,
      String difficulty,
      int score,
      boolean solved,
      Instant createdAt) {}

  public record PopularChallenge(
      Long challengeId,
      String title,
      String category,
      String difficulty,
      int score,
      boolean solved,
      long likeCount) {}

  public record Achievement(String code, String name, String description) {}

  public record GoalRequest(@Min(1) @Max(20) int weeklyTarget) {}
}
