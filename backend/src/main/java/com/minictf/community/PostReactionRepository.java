package com.minictf.community;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostReactionRepository extends JpaRepository<PostReaction, Long> {
  List<PostReaction> findByPostIdAndUserId(Long postId, Long userId);

  Optional<PostReaction> findByPostIdAndUserIdAndReactionType(
      Long postId, Long userId, String reactionType);

  List<PostReaction> findByPostIdAndUserIdAndReactionTypeIn(
      Long postId, Long userId, List<String> reactionTypes);

  @org.springframework.data.jpa.repository.Query(
      "select count(r) from PostReaction r where r.post.id=:postId and r.reactionType=:reactionType and r.user.status <> 'DELETED'")
  long countByVisibleUserPostIdAndReactionType(
      @org.springframework.data.repository.query.Param("postId") Long postId,
      @org.springframework.data.repository.query.Param("reactionType") String reactionType);

  @org.springframework.data.jpa.repository.Query(
      "select r.post.id as postId, r.reactionType as reactionType, count(r) as total from PostReaction r where r.post.id in :postIds and r.user.status <> 'DELETED' group by r.post.id, r.reactionType")
  List<ReactionCount> countByPostIds(
      @org.springframework.data.repository.query.Param("postIds") List<Long> postIds);

  interface ReactionCount {
    Long getPostId();

    String getReactionType();

    long getTotal();
  }
}
