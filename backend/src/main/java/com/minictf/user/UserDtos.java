package com.minictf.user;

import java.time.Instant;
import java.util.List;

public final class UserDtos {
  private UserDtos() {}

  public record Profile(
      Long id,
      String username,
      String nickname,
      String role,
      int score,
      long rank,
      long solvedCount) {}

  public record SolveView(Long challengeId, String title, int score, Instant solvedAt) {}

  public record SubmissionView(
      Long challengeId, String title, boolean correct, Instant submittedAt) {}

  public record Dashboard(
      Profile profile, List<SolveView> solves, List<SubmissionView> recentSubmissions) {}
}
