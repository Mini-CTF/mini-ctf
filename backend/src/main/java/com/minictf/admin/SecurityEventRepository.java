package com.minictf.admin;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {
  List<SecurityEvent> findTop100ByHiddenFalseOrderByCreatedAtDesc();

  @Modifying
  @Query("delete from SecurityEvent event where event.createdAt < :before")
  int deleteOlderThan(@Param("before") Instant before);
}
