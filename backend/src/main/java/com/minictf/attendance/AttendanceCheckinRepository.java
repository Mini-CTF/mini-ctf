package com.minictf.attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceCheckinRepository extends JpaRepository<AttendanceCheckin, Long> {
  Optional<AttendanceCheckin> findByUserIdAndCheckinDate(Long userId, LocalDate checkinDate);

  @Modifying
  @Query(
      value =
          "insert into attendance_checkins (user_id, checkin_date, checked_in_at) values (:userId, :checkinDate, CURRENT_TIMESTAMP) on conflict (user_id, checkin_date) do nothing",
      nativeQuery = true)
  int insertIfAbsent(@Param("userId") Long userId, @Param("checkinDate") LocalDate checkinDate);

  List<AttendanceCheckin> findByUserIdOrderByCheckinDateDesc(Long userId);

  @Query(
      "select c.user.id as userId, c.user.username as username, c.user.nickname as nickname, count(c) as totalDays "
          + "from AttendanceCheckin c where c.user.status <> 'DELETED' "
          + "group by c.user.id, c.user.username, c.user.nickname "
          + "order by count(c) desc, max(c.checkinDate) desc, c.user.username asc")
  List<AttendanceRank> findTopAttendance(Pageable pageable);

  @Query("select count(c) from AttendanceCheckin c where c.user.status <> 'DELETED'")
  long countByActiveUsers();

  interface AttendanceRank {
    Long getUserId();

    String getUsername();

    String getNickname();

    long getTotalDays();
  }
}
