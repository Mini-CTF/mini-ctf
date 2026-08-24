package com.minictf.community;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeCommentRepository extends JpaRepository<ChallengeComment, Long> {
  @org.springframework.data.jpa.repository.Query(
      "select c from ChallengeComment c where c.challenge.id=:challengeId and c.discussionType=:discussionType and c.user.status <> 'DELETED' order by c.createdAt asc")
  List<ChallengeComment> findVisibleByChallengeIdAndDiscussionTypeOrderByCreatedAtAsc(
      @org.springframework.data.repository.query.Param("challengeId") Long challengeId,
      @org.springframework.data.repository.query.Param("discussionType") String discussionType);
}
