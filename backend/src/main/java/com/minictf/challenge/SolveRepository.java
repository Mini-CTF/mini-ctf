package com.minictf.challenge;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SolveRepository extends JpaRepository<Solve, Long> {
  @Query("select s from Solve s where s.user.id=:userId and s.challenge.id=:challengeId")
  Optional<Solve> findByUserAndChallenge(
      @Param("userId") Long userId, @Param("challengeId") Long challengeId);

  @Query(
      "select s from Solve s join fetch s.challenge where s.user.id=:userId order by s.solvedAt desc")
  List<Solve> findByUserId(@Param("userId") Long userId);

  @Query("select count(s) from Solve s where s.challenge.id=:challengeId")
  long countByChallengeId(@Param("challengeId") Long challengeId);

  @Query("select count(s) from Solve s where s.user.id=:userId")
  long countByUser(@Param("userId") Long userId);

  @Query("select count(s) from Solve s where s.user.id=:userId and s.user.status <> 'DELETED'")
  long countByActiveUser(@Param("userId") Long userId);

  @Query("select count(s) from Solve s where s.user.status <> 'DELETED'")
  long countByActiveUsers();

  @Query("select s.challenge.id from Solve s where s.user.id=:userId")
  Set<Long> findChallengeIdsByUserId(@Param("userId") Long userId);

  boolean existsByUserIdAndSolvedAtGreaterThanEqual(Long userId, Instant since);

  @Modifying
  @Query("delete from Solve solve where solve.user.id = :userId")
  int deleteByUserId(@Param("userId") Long userId);
}
