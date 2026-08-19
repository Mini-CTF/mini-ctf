package com.minictf.challenge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface SolveRepository extends JpaRepository<Solve, Long> {
    @Query("select s from Solve s where s.user.id = :userId and s.challenge.id = :challengeId")
    Optional<Solve> findByUserIdAndChallengeId(@Param("userId") Long userId, @Param("challengeId") Long challengeId);
    @Query("select s from Solve s where s.user.id = :userId order by s.solvedAt desc")
    List<Solve> findByUserIdOrderBySolvedAtDesc(@Param("userId") Long userId);
    @Query("select count(s) from Solve s where s.challenge.id = :challengeId")
    long countByChallengeId(@Param("challengeId") Long challengeId);
    @Query("select count(s) from Solve s where s.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);
}
