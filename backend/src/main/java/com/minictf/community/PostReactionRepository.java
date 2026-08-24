package com.minictf.community;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostReactionRepository extends JpaRepository<PostReaction, Long> {
  Optional<PostReaction> findByPostIdAndUserId(Long postId, Long userId);

  long countByPostIdAndReactionType(Long postId, String reactionType);
}
