package com.minictf.anticheat;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeActivityEventRepository
    extends JpaRepository<ChallengeActivityEvent, Long> {
  Optional<ChallengeActivityEvent> findTopByUserIdAndChallengeIdOrderByOccurredAtAsc(
      Long userId, Long challengeId);
}
