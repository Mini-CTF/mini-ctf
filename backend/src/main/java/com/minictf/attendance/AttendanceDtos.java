package com.minictf.attendance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class AttendanceDtos {
  private AttendanceDtos() {}

  public record Badge(String id, String name, String description) {}

  public record Title(String id, String name, String requirement) {}

  public record Summary(
      int totalDays,
      int currentStreak,
      int longestStreak,
      boolean checkedInToday,
      String activeTitle,
      List<Badge> badges,
      List<Title> earnedTitles) {}

  public record RankingRow(
      int rank,
      String username,
      String nickname,
      long totalDays,
      int currentStreak,
      String avatarUrl,
      String equippedFrame,
      String equippedAccessory,
      String equippedTitle,
      String tier) {}

  public record TitleRequest(@NotBlank @Size(max = 40) String titleId) {}
}
