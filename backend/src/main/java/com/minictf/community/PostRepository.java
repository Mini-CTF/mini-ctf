package com.minictf.community;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {
  @Query("select p from Post p where p.user.status <> 'DELETED' order by p.createdAt desc")
  Page<Post> findVisibleAllByCreatedAtDesc(Pageable pageable);

  @Query(
      "select p from Post p where p.category=:category and p.user.status <> 'DELETED' order by p.createdAt desc")
  Page<Post> findVisibleByCategoryOrderByCreatedAtDesc(
      @Param("category") String category, Pageable pageable);

  @Modifying
  @Query("update Post p set p.viewCount=p.viewCount+1 where p.id=:id")
  int incrementViewCount(@Param("id") Long id);
}
