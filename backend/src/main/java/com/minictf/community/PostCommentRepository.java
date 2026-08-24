package com.minictf.community;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
  List<PostComment> findByPostIdOrderByCreatedAtAsc(Long postId);

  List<PostComment> findTop100ByOrderByCreatedAtDesc();

  long countByPostId(Long postId);
}
