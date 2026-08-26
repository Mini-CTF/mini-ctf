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
  private static final List<TitleRule> TITLES =
      List.of(
          new TitleRule(FIRST_CHECK, "First Check", "1 total day", 1, false),
          new TitleRule("WEEK_WATCH", "Week Watch", "7-day streak", 7, true),
          new TitleRule("MONTH_OPERATOR", "Month Operator", "30-day streak", 30, true),
          new TitleRule("CENTURY_OPERATOR", "Century Operator", "100 total days", 100, false),
          new TitleRule("YEAR_ROUND", "Year-Round Operator", "365 total days", 365, false));

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
    List<AttendanceDtos.Title> earnedTitles =
        new ArrayList<>(
            TITLES.stream()
                .filter(
                    rule ->
                        rule.streak
                            ? longestStreak >= rule.threshold
                            : dates.size() >= rule.threshold)
                .map(rule -> new AttendanceDtos.Title(rule.id, rule.name, rule.requirement))
                .toList());
    boolean admin = "ADMIN".equals(user.getRole());
    if (admin)
      earnedTitles.addAll(
          UserTier.all().stream()
              .map(
                  tier ->
                      new AttendanceDtos.Title(
                          tier.id().toUpperCase(), tier.name(), tier.minimumScore() + " points"))
              .toList());
    if (admin)
      earnedTitles.add(new AttendanceDtos.Title(SUPER_USER, "Super User", "Administrator title"));
    String activeTitle = user.getAttendanceTitle();
    String selectedTitle = activeTitle;
    if (!"NONE".equals(selectedTitle)
        && earnedTitles.stream().noneMatch(title -> title.id().equals(selectedTitle)))
      activeTitle = earnedTitles.isEmpty() ? null : earnedTitles.get(earnedTitles.size() - 1).id();
    return new AttendanceDtos.Summary(
        dates.size(),
        currentStreak,
        longestStreak,
        dates.contains(today),
        activeTitle,
        badges,
        earnedTitles);
  }

  @Transactional
  public AttendanceDtos.Summary selectTitle(User user, AttendanceDtos.TitleRequest request) {
    if ("NONE".equals(request.titleId())) {
      user.setAttendanceTitle("NONE");
      users.save(user);
      return summary(user);
    }
    AttendanceDtos.Summary current = summary(user);
    if (current.earnedTitles().stream().noneMatch(title -> title.id().equals(request.titleId())))
      throw new IllegalArgumentException("That title has not been earned");
    user.setAttendanceTitle(request.titleId());
    users.save(user);
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
              row.getEquippedFrame(),
              row.getEquippedAccessory(),
              row.getEquippedVaultTitle() != null
                  ? row.getEquippedVaultTitle()
                  : "NONE".equals(row.getAttendanceTitle()) ? null : row.getAttendanceTitle(),
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

  private record BadgeRule(
      String id, String name, String description, int threshold, boolean streak) {}

  private record TitleRule(
      String id, String name, String requirement, int threshold, boolean streak) {}
}
