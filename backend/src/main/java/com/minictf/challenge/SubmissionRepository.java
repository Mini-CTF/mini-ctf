package com.minictf.challenge;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface SubmissionRepository extends JpaRepository<Submission,Long>{@Query("select s from Submission s join fetch s.challenge where s.user.id=:userId order by s.submittedAt desc")List<Submission> findByUserId(@Param("userId")Long userId,Pageable pageable);}
