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

  public AdminModerationService(
      UserRepository users,
      SubmissionRepository submissions,
      AntiCheatEventRepository antiCheatEvents,
      AdminAuditLogRepository auditLogs) {
    this.users = users;
    this.submissions = submissions;
    this.antiCheatEvents = antiCheatEvents;
    this.auditLogs = auditLogs;
  }

  @Transactional(readOnly = true)
  public AdminDtos.Dashboard dashboard() {
    return new AdminDtos.Dashboard(users(), submissions(), events(), logs());
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
    return auditLogs.findTop100ByOrderByCreatedAtDesc().stream()
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
