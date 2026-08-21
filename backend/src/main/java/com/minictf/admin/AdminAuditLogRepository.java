package com.minictf.admin;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {
  List<AdminAuditLog> findTop100ByOrderByCreatedAtDesc();
}
