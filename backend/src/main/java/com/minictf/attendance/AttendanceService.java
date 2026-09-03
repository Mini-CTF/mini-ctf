package com.minictf.attendance;

import com.minictf.user.User;
import com.minictf.user.UserRepository;
import com.minictf.user.UserTier;
import java.time.*;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {
  private static final ZoneId PLATFORM_ZONE = ZoneId.of("Asia/Seoul");
  private static final String FIRST_CHECK = "FIRST_CHECK";
  private static final String SUPER_USER = "SUPER_USER";
  private static final String SUB_ADMIN = "SUB_ADMIN";
  private static final List<BadgeRule> BADGES =
      List.of(
          new BadgeRule(
              FIRST_CHECK, "First Check", "Complete your first daily check-in.", 1, false),
          new BadgeRule(
              "THREE_DAY_STREAK", "Three-Day Run", "Reach a 3-day check-in streak.", 3, true),
          new BadgeRule(
              "SEVEN_DAY_STREAK", "Week Watch", "Reach a 7-day check-in streak.", 7, true),
          new BadgeRule(
              "THIRTY_DAY_STREAK", "Month Watch", "Reach a 30-day check-in streak.", 30, true),
          new BadgeRule("HUNDRED_DAYS", "Century", "Reach 100 total check-in days.", 100, false),
          new BadgeRule(
              "THREE_SIXTY_FIVE_DAYS", "Year-Round", "Reach 365 total check-in days.", 365, false));
  private final AttendanceCheckinRepository checkins;
  private final UserRepository users;

  public AttendanceService(AttendanceCheckinRepository checkins, UserRepository users) {
    this.checkins = checkins;
    this.users = users;
  }

  @Transactional
  public AttendanceDtos.Summary checkIn(User user) {
    LocalDate today = today();
    if (checkins.findByUserIdAndCheckinDate(user.getId(), today).isEmpty()) {
      AttendanceCheckin checkin = new AttendanceCheckin();
      checkin.setUser(user);
      checkin.setCheckinDate(today);
      try {
        checkins.saveAndFlush(checkin);
      } catch (DataIntegrityViolationException ignored) {
        // A concurrent request completed the same once-per-day check-in first.
      }
    }
    return summary(user);
  }

  @Transactional(readOnly = true)
  public AttendanceDtos.Summary summary(User user) {
    List<LocalDate> dates = dates(user.getId());
    LocalDate today = today();
    int currentStreak = currentStreak(dates, today);
    int longestStreak = longestStreak(dates);
    List<AttendanceDtos.Badge> badges =
        BADGES.stream()
            .filter(
                rule ->
                    rule.streak ? longestStreak >= rule.threshold : dates.size() >= rule.threshold)
            .map(rule -> new AttendanceDtos.Badge(rule.id, rule.name, rule.description))
            .toList();
    String roleTitle = roleTitle(user);
    List<AttendanceDtos.Title> earnedTitles =
        roleTitle == null
            ? List.of()
            : List.of(
                new AttendanceDtos.Title(
                    roleTitle,
                    SUPER_USER.equals(roleTitle) ? "Super User" : "Sub-admin",
                    "Administrator title"));
    String activeTitle = roleTitle;
    return new AttendanceDtos.Summary(
        dates.size(),
        currentStreak,
        longestStreak,
        dates.contains(today),
        activeTitle,
        badges,
        earnedTitles,
        dates.stream().map(LocalDate::toString).toList());
  }

  @Transactional
  public AttendanceDtos.Summary selectTitle(User user, AttendanceDtos.TitleRequest request) {
    if (!"ADMIN".equals(user.getRole()) || !SUPER_USER.equals(request.titleId()))
      throw new IllegalArgumentException("Only administrators can use the Super User title");
    return summary(user);
  }

  @Transactional(readOnly = true)
  public List<AttendanceDtos.RankingRow> ranking() {
    List<AttendanceDtos.RankingRow> rows = new ArrayList<>();
    int rank = 0;
    long previousTotal = -1;
    for (AttendanceCheckinRepository.AttendanceRank row :
        checkins.findTopAttendance(PageRequest.of(0, 100))) {
      if (row.getTotalDays() != previousTotal) rank = rows.size() + 1;
      List<LocalDate> dates = dates(row.getUserId());
      rows.add(
          new AttendanceDtos.RankingRow(
              rank,
              row.getUsername(),
              row.getNickname(),
              row.getTotalDays(),
              currentStreak(dates, today()),
              avatarUrl(row.getUsername(), row.getAvatarPath()),
              null,
              null,
              roleTitle(row.getRole()),
              UserTier.forScore(row.getScore()).id()));
      previousTotal = row.getTotalDays();
    }
    return rows;
  }

  private List<LocalDate> dates(Long userId) {
    return checkins.findByUserIdOrderByCheckinDateDesc(userId).stream()
        .map(AttendanceCheckin::getCheckinDate)
        .toList();
  }

  private int currentStreak(List<LocalDate> dates, LocalDate today) {
    Set<LocalDate> unique = new HashSet<>(dates);
    LocalDate cursor = unique.contains(today) ? today : today.minusDays(1);
    int streak = 0;
    while (unique.contains(cursor)) {
      streak++;
      cursor = cursor.minusDays(1);
    }
    return streak;
  }

  private int longestStreak(List<LocalDate> dates) {
    if (dates.isEmpty()) return 0;
    List<LocalDate> ascending = new ArrayList<>(dates);
    ascending.sort(Comparator.naturalOrder());
    int longest = 1;
    int run = 1;
    for (int i = 1; i < ascending.size(); i++) {
      if (ascending.get(i).equals(ascending.get(i - 1).plusDays(1))) run++;
      else run = 1;
      longest = Math.max(longest, run);
    }
    return longest;
  }

  private LocalDate today() {
    return LocalDate.now(PLATFORM_ZONE);
  }

  private static String avatarUrl(String username, String avatarPath) {
    if (avatarPath == null) return null;
    return "/api/users/"
        + username
        + "/avatar?v="
        + Integer.toUnsignedString(avatarPath.hashCode());
  }

  private static String roleTitle(User user) {
    return roleTitle(user.getRole());
  }

  private static String roleTitle(String role) {
    if ("ADMIN".equals(role)) return SUPER_USER;
    return "MODERATOR".equals(role) ? SUB_ADMIN : null;
  }

  private record BadgeRule(
      String id, String name, String description, int threshold, boolean streak) {}
}
