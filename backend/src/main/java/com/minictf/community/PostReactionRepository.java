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

  long countByPostIdAndReactionType(Long postId, String reactionType);
}
