package com.minictf.learning;

import java.util.List;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChallengeLikeRepository extends JpaRepository<ChallengeLike, ChallengeLikeId> {
  boolean existsByUserIdAndChallengeId(Long userId, Long challengeId);

  void deleteByUserIdAndChallengeId(Long userId, Long challengeId);

  @Query("select entry.challenge.id from ChallengeLike entry where entry.user.id = :userId")
  Set<Long> findChallengeIdsByUserId(@Param("userId") Long userId);

  @Query("select entry.challenge.id, count(entry) from ChallengeLike entry where entry.challenge.id in :challengeIds group by entry.challenge.id")
  List<Object[]> countByChallengeIds(@Param("challengeIds") Set<Long> challengeIds);

  @Query("select entry from ChallengeLike entry join fetch entry.challenge where entry.challenge.active = true order by entry.createdAt desc")
  List<ChallengeLike> findAllWithActiveChallenge();
}
