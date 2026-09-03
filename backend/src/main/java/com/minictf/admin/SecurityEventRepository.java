package com.minictf.admin;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {
  long countByEventTypeAndIpAddress(String eventType, String ipAddress);

  long countByEventTypeAndDeviceFingerprint(String eventType, String deviceFingerprint);

  Optional<SecurityEvent> findFirstByUserIdAndEventTypeInAndIpAddressIsNotNullOrderByCreatedAtAsc(
      Long userId, Collection<String> eventTypes);

  @Query(
      "select event from SecurityEvent event left join fetch event.user where event.hidden = false and (event.user is null or event.user.status <> 'DELETED') order by event.createdAt desc")
  List<SecurityEvent> findVisible(Pageable pageable);

  List<SecurityEvent> findTop25ByUserIdAndHiddenFalseOrderByCreatedAtDesc(Long userId);

  @Modifying
  @Query("delete from SecurityEvent event where event.createdAt < :before")
  int deleteOlderThan(@Param("before") Instant before);
}
