package com.minictf.community;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeCommentRepository extends JpaRepository<ChallengeComment, Long> {
  List<ChallengeComment> findByChallengeIdAndDiscussionTypeOrderByCreatedAtAsc(
      Long challengeId, String discussionType);
}
