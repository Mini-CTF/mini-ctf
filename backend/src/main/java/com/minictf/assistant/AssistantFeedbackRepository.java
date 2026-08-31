package com.minictf.assistant;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssistantFeedbackRepository extends JpaRepository<AssistantFeedback, Long> {
  List<AssistantFeedback> findTop100ByOrderByCreatedAtDesc();
}
