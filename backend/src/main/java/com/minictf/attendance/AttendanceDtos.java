package com.minictf.attendance;

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
      List<Title> earnedTitles,
      List<String> checkInDates) {}

  public record RankingRow(
      int rank,
      String username,
      String nickname,
      long totalDays,
      int currentStreak,
      String avatarUrl,
      String equippedTitle,
      String tier) {}
}
