package com.minictf.anticheat;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AntiCheatEventRepository extends JpaRepository<AntiCheatEvent, Long> {
  boolean existsByUserIdAndChallengeIdAndEventType(Long userId, Long challengeId, String eventType);

  List<AntiCheatEvent> findTop100ByOrderByCreatedAtDesc();

  @Modifying
  @Query("delete from AntiCheatEvent event where event.createdAt < :before")
  int deleteOlderThan(@Param("before") Instant before);
}
