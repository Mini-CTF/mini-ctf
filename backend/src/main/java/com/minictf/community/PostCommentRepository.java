package com.minictf.community;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
  List<PostComment> findByPostIdOrderByCreatedAtAsc(Long postId);

  List<PostComment> findTop100ByOrderByCreatedAtDesc();

  long countByPostId(Long postId);

  @Modifying
  @Query("update PostComment c set c.pinnedAt = null where c.post.id = :postId and c.pinnedAt is not null")
  int clearPinnedByPostId(@Param("postId") Long postId);
}
