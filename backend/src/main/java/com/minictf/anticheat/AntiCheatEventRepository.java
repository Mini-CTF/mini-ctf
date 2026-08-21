package com.minictf.anticheat;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AntiCheatEventRepository extends JpaRepository<AntiCheatEvent, Long> {
  boolean existsByUserIdAndChallengeIdAndEventType(Long userId, Long challengeId, String eventType);

  List<AntiCheatEvent> findTop100ByOrderByCreatedAtDesc();
}
