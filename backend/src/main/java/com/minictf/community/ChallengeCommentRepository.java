package com.minictf.community;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ChallengeCommentRepository extends JpaRepository<ChallengeComment,Long>{List<ChallengeComment> findByChallengeIdAndDiscussionTypeOrderByCreatedAtAsc(Long challengeId,String discussionType);}
