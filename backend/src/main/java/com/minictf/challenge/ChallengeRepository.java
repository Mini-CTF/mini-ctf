package com.minictf.challenge;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChallengeRepository extends JpaRepository<Challenge, Long> {
    List<Challenge> findByActiveTrueOrderByIdAsc();
}
