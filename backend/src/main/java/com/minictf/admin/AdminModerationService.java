package com.minictf.admin;

import com.minictf.anticheat.AntiCheatEventRepository;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminModerationService {
  private final UserRepository users;
  private final SubmissionRepository submissions;
  private final AntiCheatEventRepository antiCheatEvents;
  private final AdminAuditLogRepository auditLogs;
  private final SecurityEventRepository securityEvents;

  public AdminModerationService(
      UserRepository users,
      SubmissionRepository submissions,
      AntiCheatEventRepository antiCheatEvents,
      AdminAuditLogRepository auditLogs,
      SecurityEventRepository securityEvents) {
    this.users = users;
    this.submissions = submissions;
    this.antiCheatEvents = antiCheatEvents;
    this.auditLogs = auditLogs;
    this.securityEvents = securityEvents;
  }

  @Transactional(readOnly = true)
  public AdminDtos.Dashboard dashboard() {
    return new AdminDtos.Dashboard(users(), submissions(), events(), logs(), securityEvents());
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.UserView> users() {
    return users.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
        .limit(100)
        .map(this::userView)
        .toList();
  }

  @Transactional
  public AdminDtos.UserView updateNickname(
      Long targetId, AdminDtos.UserUpdateRequest request, String adminUsername) {
    User target = target(targetId);
    target.setNickname(request.nickname().trim());
    audit(adminUsername, "UPDATE_USER", "USER", targetId, "Updated nickname");
    return userView(target);
  }

  @Transactional
  public AdminDtos.UserView suspend(
      Long targetId, AdminDtos.SuspensionRequest request, String adminUsername) {
    User target = target(targetId);
    ensureNotAdmin(target);
    target.setStatus("SUSPENDED");
    target.setSuspensionReason(request.reason().trim());
    target.setSuspendedAt(Instant.now());
    audit(adminUsername, "SUSPEND_USER", "USER", targetId, target.getSuspensionReason());
    return userView(target);
  }

  @Transactional
  public AdminDtos.UserView reinstate(Long targetId, String adminUsername) {
    User target = target(targetId);
    ensureNotAdmin(target);
    target.setStatus("ACTIVE");
    target.setSuspensionReason(null);
    target.setSuspendedAt(null);
    audit(adminUsername, "REINSTATE_USER", "USER", targetId, "Account reinstated");
    return userView(target);
  }

  @Transactional
  public void deactivate(Long targetId, String adminUsername) {
    User target = target(targetId);
    ensureNotAdmin(target);
    target.setStatus("SUSPENDED");
    target.setSuspensionReason("Account removed by an administrator");
    target.setSuspendedAt(Instant.now());
    target.setNickname("Deleted user");
    target.setUsername("deleted_" + target.getId());
    audit(adminUsername, "DEACTIVATE_USER", "USER", targetId, "Anonymized and suspended account");
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.SubmissionView> submissions() {
    return submissions.findAllWithDetails(PageRequest.of(0, 100)).stream()
        .map(
            s ->
                new AdminDtos.SubmissionView(
                    s.getUser().getUsername(),
                    s.getChallengeTitle(),
                    s.isCorrect(),
                    s.getSubmittedAt()))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.AntiCheatEventView> events() {
    return antiCheatEvents.findTop100ByOrderByCreatedAtDesc().stream()
        .map(
            e ->
                new AdminDtos.AntiCheatEventView(
                    e.getId(),
                    e.getUser().getUsername(),
                    e.getChallenge() == null ? null : e.getChallenge().getTitle(),
                    e.getEventType(),
                    e.getSeverity(),
                    e.getDetail(),
                    e.getCreatedAt()))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.AuditLogView> logs() {
    return auditLogs.findTop100ByHiddenFalseOrderByCreatedAtDesc().stream()
        .map(
            log ->
                new AdminDtos.AuditLogView(
                    log.getId(),
                    log.getAdmin().getUsername(),
                    log.getAction(),
                    log.getTargetType(),
                    log.getTargetId(),
                    log.getDetail(),
                    log.getCreatedAt()))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.SecurityEventView> securityEvents() {
    return securityEvents.findTop100ByHiddenFalseOrderByCreatedAtDesc().stream()
        .map(
            event ->
                new AdminDtos.SecurityEventView(
                    event.getId(),
                    event.getUser() == null ? null : event.getUser().getUsername(),
                    event.getEventType(),
                    event.getSubject(),
                    event.getDetail(),
                    event.getCreatedAt(),
                    event.getRedactedAt()))
        .toList();
  }

  @Transactional
  public void redactAuditLog(Long id, AdminDtos.LogControlRequest request, String adminUsername) {
    AdminAuditLog log =
        auditLogs.findById(id).orElseThrow(() -> new EntityNotFoundException("Log not found"));
    log.redact(request.reason().trim());
    audit(adminUsername, "REDACT_AUDIT_LOG", "AUDIT_LOG", id, request.reason().trim());
  }

  @Transactional
  public void hideAuditLog(Long id, AdminDtos.LogControlRequest request, String adminUsername) {
    AdminAuditLog log =
        auditLogs.findById(id).orElseThrow(() -> new EntityNotFoundException("Log not found"));
    log.setHidden(true);
    audit(adminUsername, "HIDE_AUDIT_LOG", "AUDIT_LOG", id, request.reason().trim());
  }

  @Transactional
  public void redactSecurityEvent(
      Long id, AdminDtos.LogControlRequest request, String adminUsername) {
    SecurityEvent event =
        securityEvents.findById(id).orElseThrow(() -> new EntityNotFoundException("Log not found"));
    event.redact(request.reason().trim());
    audit(adminUsername, "REDACT_SECURITY_EVENT", "SECURITY_EVENT", id, request.reason().trim());
  }

  @Transactional
  public void hideSecurityEvent(
      Long id, AdminDtos.LogControlRequest request, String adminUsername) {
    SecurityEvent event =
        securityEvents.findById(id).orElseThrow(() -> new EntityNotFoundException("Log not found"));
    event.setHidden(true);
    audit(adminUsername, "HIDE_SECURITY_EVENT", "SECURITY_EVENT", id, request.reason().trim());
  }

  private User target(Long id) {
    return users.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found"));
  }

  private void ensureNotAdmin(User user) {
    if ("ADMIN".equals(user.getRole()))
      throw new AccessDeniedException("Administrators cannot be moderated");
  }

  private void audit(
      String adminUsername, String action, String targetType, Long targetId, String detail) {
    User admin = users.findByUsernameIgnoreCase(adminUsername).orElseThrow();
    AdminAuditLog log = new AdminAuditLog();
    log.setAdmin(admin);
    log.setAction(action);
    log.setTargetType(targetType);
    log.setTargetId(targetId);
    log.setDetail(detail);
    auditLogs.save(log);
  }

  private AdminDtos.UserView userView(User user) {
    return new AdminDtos.UserView(
        user.getId(),
        user.getUsername(),
        user.getNickname(),
        user.getRole(),
        user.getStatus(),
        user.getSuspensionReason(),
        user.getScore(),
        user.getCreatedAt(),
        user.getSuspendedAt());
  }
}
