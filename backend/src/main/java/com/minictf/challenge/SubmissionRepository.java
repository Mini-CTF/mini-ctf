package com.minictf.challenge;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
  @Query(
      "select count(submission) from Submission submission where submission.user.id = :userId and submission.challenge.id = :challengeId and submission.correct = false and submission.submittedAt >= :since")
  long countRecentIncorrectByUserAndChallenge(
      @Param("userId") Long userId,
      @Param("challengeId") Long challengeId,
      @Param("since") Instant since);

  @Modifying
  @Query("delete from Submission submission where submission.user.id = :userId")
  int deleteByUserId(@Param("userId") Long userId);

  @Query(
      "select s from Submission s join fetch s.challenge where s.user.id=:userId order by s.submittedAt desc")
  List<Submission> findByUserId(@Param("userId") Long userId, Pageable pageable);

  @Query(
      "select s from Submission s join fetch s.user join fetch s.challenge where s.user.status <> 'DELETED' order by s.submittedAt desc")
  List<Submission> findAllWithActiveUsers(Pageable pageable);
}
