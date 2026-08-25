package com.minictf.user;

import jakarta.validation.constraints.Size;
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
      long solvedCount,
      String statusMessage,
      String avatarUrl,
      String equippedFrame,
      String equippedAccessory,
      String equippedTitle) {}

  public record PublicFriend(
      String username,
      String nickname,
      String avatarUrl,
      String equippedFrame,
      String equippedAccessory,
      String equippedTitle) {}

  public record ProfileUpdateRequest(
      @Size(max = 80) String nickname, @Size(max = 160) String statusMessage) {}

  public record PublicProfile(
      String username,
      String nickname,
      int score,
      long solvedCount,
      String statusMessage,
      String avatarUrl,
      String equippedFrame,
      String equippedAccessory,
      String equippedTitle,
      List<PublicFriend> friends) {}

  public record SolveView(Long challengeId, String title, int score, Instant solvedAt) {}

  public record SubmissionView(
      Long challengeId, String title, boolean correct, Instant submittedAt) {}

  public record Dashboard(
      Profile profile, List<SolveView> solves, List<SubmissionView> recentSubmissions) {}
}
