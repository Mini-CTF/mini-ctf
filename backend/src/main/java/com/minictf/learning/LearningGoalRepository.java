package com.minictf.learning;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningGoalRepository extends JpaRepository<LearningGoal, Long> {
  Optional<LearningGoal> findByUserId(Long userId);
}
