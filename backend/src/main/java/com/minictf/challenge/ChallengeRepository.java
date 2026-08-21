package com.minictf.challenge;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeRepository extends JpaRepository<Challenge, Long> {
  boolean existsByTitle(String title);

  List<Challenge> findByActiveTrueOrderByIdAsc();

  long countByActiveTrue();
}
