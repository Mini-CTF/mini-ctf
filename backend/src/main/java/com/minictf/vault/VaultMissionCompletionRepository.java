package com.minictf.vault;

import java.time.LocalDate;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VaultMissionCompletionRepository
    extends JpaRepository<VaultMissionCompletion, Long> {
  boolean existsByUserIdAndMissionIdAndMissionDate(
      Long userId, String missionId, LocalDate missionDate);

  @Query(
      "select completion.missionId from VaultMissionCompletion completion "
          + "where completion.user.id=:userId and completion.missionDate=:date")
  Set<String> findMissionIdsByUserAndDate(
      @Param("userId") Long userId, @Param("date") LocalDate date);
}
