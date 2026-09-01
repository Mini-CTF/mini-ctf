package com.minictf.challenge;

import java.util.List;
import java.time.Instant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
  long countByUserIdAndChallengeIdAndCorrectFalseAndSubmittedAtGreaterThanEqual(
      Long userId, Long challengeId, Instant since);
  @Query(
      "select s from Submission s join fetch s.challenge where s.user.id=:userId order by s.submittedAt desc")
  List<Submission> findByUserId(@Param("userId") Long userId, Pageable pageable);

  @Query(
      "select s from Submission s join fetch s.user join fetch s.challenge where s.user.status <> 'DELETED' order by s.submittedAt desc")
  List<Submission> findAllWithActiveUsers(Pageable pageable);
}
