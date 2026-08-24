package com.minictf.vault;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VaultHiddenMissionRepository extends JpaRepository<VaultHiddenMission, Long> {
  boolean existsByUserIdAndMissionId(Long userId, String missionId);

  List<VaultHiddenMission> findByUserId(Long userId);
}
