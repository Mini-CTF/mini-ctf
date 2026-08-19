package com.minictf.challenge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    @Query("select s from Submission s where s.user.id = :userId order by s.submittedAt desc")
    List<Submission> findTop100ByUserIdOrderBySubmittedAtDesc(@Param("userId") Long userId, org.springframework.data.domain.Pageable pageable);
}
