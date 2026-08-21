package com.minictf.community;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface PostRepository extends JpaRepository<Post,Long>{Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);Page<Post> findByCategoryOrderByCreatedAtDesc(String category,Pageable pageable);@Modifying @Query("update Post p set p.viewCount=p.viewCount+1 where p.id=:id")int incrementViewCount(@Param("id")Long id);}
