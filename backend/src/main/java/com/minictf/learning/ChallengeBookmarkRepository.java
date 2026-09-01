package com.minictf.learning;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChallengeBookmarkRepository
    extends JpaRepository<ChallengeBookmark, ChallengeBookmarkId> {
  boolean existsByUserIdAndChallengeId(Long userId, Long challengeId);

  void deleteByUserIdAndChallengeId(Long userId, Long challengeId);

  long countByUserId(Long userId);

  @Query(
      "select bookmark from ChallengeBookmark bookmark join fetch bookmark.challenge where bookmark.user.id = :userId order by bookmark.createdAt desc")
  List<ChallengeBookmark> findAllForUser(@Param("userId") Long userId);
}
