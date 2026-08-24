package com.minictf.community;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
  @Query(
      "select c from PostComment c where c.post.id=:postId and c.user.status <> 'DELETED' order by c.createdAt asc")
  List<PostComment> findVisibleByPostIdOrderByCreatedAtAsc(@Param("postId") Long postId);

  List<PostComment> findTop100ByOrderByCreatedAtDesc();

  @Query("select c from PostComment c where c.user.status <> 'DELETED' order by c.createdAt desc")
  List<PostComment> findTop100VisibleByOrderByCreatedAtDesc();

  @Query(
      "select count(c) from PostComment c where c.post.id=:postId and c.user.status <> 'DELETED'")
  long countByVisibleUserPostId(@Param("postId") Long postId);

  @Query(
      "select c.post.id as postId, count(c) as total from PostComment c where c.post.id in :postIds and c.user.status <> 'DELETED' group by c.post.id")
  List<PostCount> countByPostIds(@Param("postIds") List<Long> postIds);

  @Modifying
  @Query(
      "update PostComment c set c.pinnedAt = null where c.post.id = :postId and c.pinnedAt is not null")
  int clearPinnedByPostId(@Param("postId") Long postId);

  interface PostCount {
    Long getPostId();

    long getTotal();
  }
}
