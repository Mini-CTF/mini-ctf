package com.minictf.admin;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {
  @Query(
      "select log from AdminAuditLog log join fetch log.admin where log.hidden = false order by log.createdAt desc")
  List<AdminAuditLog> findVisibleWithAdmin(Pageable pageable);

  List<AdminAuditLog> findTop25ByTargetTypeAndTargetIdAndHiddenFalseOrderByCreatedAtDesc(
      String targetType, Long targetId);
}
