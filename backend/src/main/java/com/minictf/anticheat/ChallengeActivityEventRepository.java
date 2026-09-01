package com.minictf.anticheat;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChallengeActivityEventRepository
    extends JpaRepository<ChallengeActivityEvent, Long> {
  Optional<ChallengeActivityEvent> findTopByUserIdAndChallengeIdOrderByOccurredAtAsc(
      Long userId, Long challengeId);

  Optional<ChallengeActivityEvent>
      findTopByUserIdAndChallengeIdAndActivityTypeOrderByOccurredAtDesc(
          Long userId, Long challengeId, String activityType);

  boolean existsByUserIdAndActivityTypeAndOccurredAtGreaterThanEqual(
      Long userId, String activityType, Instant since);

  @Modifying
  @Query("delete from ChallengeActivityEvent event where event.occurredAt < :before")
  int deleteOlderThan(@Param("before") Instant before);
}
