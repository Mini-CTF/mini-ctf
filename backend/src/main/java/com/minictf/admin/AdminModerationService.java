package com.minictf.admin;

import com.minictf.anticheat.AntiCheatEventRepository;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.community.Post;
import com.minictf.community.PostComment;
import com.minictf.community.PostCommentRepository;
import com.minictf.community.PostRepository;
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
  private final PostRepository posts;
  private final PostCommentRepository postComments;

  public AdminModerationService(
      UserRepository users,
      SubmissionRepository submissions,
      AntiCheatEventRepository antiCheatEvents,
      AdminAuditLogRepository auditLogs,
      SecurityEventRepository securityEvents,
      PostRepository posts,
      PostCommentRepository postComments) {
    this.users = users;
    this.submissions = submissions;
    this.antiCheatEvents = antiCheatEvents;
    this.auditLogs = auditLogs;
    this.securityEvents = securityEvents;
    this.posts = posts;
    this.postComments = postComments;
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
    if ("DELETED".equals(target.getStatus()))
      throw new IllegalArgumentException("Restore the account before editing it");
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
    if ("DELETED".equals(target.getStatus())) {
      restoreDeletedAccount(target);
      audit(adminUsername, "RESTORE_USER", "USER", targetId, "Account and user data restored");
      return userView(target);
    }
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
    if ("DELETED".equals(target.getStatus())) return;
    target.setDeletedOriginalUsername(target.getUsername());
    target.setDeletedOriginalNickname(target.getNickname());
    target.setDeletedOriginalScore(target.getScore());
    target.setDeletedOriginalStatus(target.getStatus());
    target.setDeletedOriginalSuspensionReason(target.getSuspensionReason());
    target.setDeletedOriginalSuspendedAt(target.getSuspendedAt());
    target.setDeletedAt(Instant.now());
    target.setStatus("DELETED");
    target.setSuspensionReason("Account removed by an administrator");
    target.setSuspendedAt(target.getDeletedAt());
    target.setScore(0);
    target.setNickname("Deleted user");
    target.setUsername("deleted_" + target.getId());
    audit(
        adminUsername,
        "DEACTIVATE_USER",
        "USER",
        targetId,
        "Account data hidden and progress reset; reversible restore is available");
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.SubmissionView> submissions() {
    return submissions.findAllWithActiveUsers(PageRequest.of(0, 100)).stream()
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
    return antiCheatEvents.findTop100WithActiveUsers().stream()
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
    return securityEvents.findTop100VisibleOrderByCreatedAtDesc().stream()
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

  @Transactional(readOnly = true)
  public List<AdminDtos.ModerationPostView> communityPosts() {
    return posts.findVisibleAllByCreatedAtDesc(PageRequest.of(0, 100)).stream()
        .map(
            post ->
                new AdminDtos.ModerationPostView(
                    post.getId(),
                    post.getTitle(),
                    post.getCategory(),
                    post.getUser().getUsername(),
                    post.getUser().getNickname(),
                    postComments.countByVisibleUserPostId(post.getId()),
                    post.getCreatedAt()))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.ModerationCommentView> communityComments() {
    return postComments.findTop100VisibleByOrderByCreatedAtDesc().stream()
        .map(
            comment ->
                new AdminDtos.ModerationCommentView(
                    comment.getId(),
                    comment.getPost().getId(),
                    comment.getPost().getTitle(),
                    comment.getContent(),
                    comment.getUser().getUsername(),
                    comment.getUser().getNickname(),
                    comment.getCreatedAt()))
        .toList();
  }

  @Transactional
  public AdminDtos.ModerationPostView publishNotice(
      AdminDtos.NoticeRequest request, String adminUsername) {
    User admin = users.findByUsernameIgnoreCase(adminUsername).orElseThrow();
    Post notice = new Post();
    notice.setUser(admin);
    notice.setTitle(request.title().trim());
    notice.setContent(request.content().trim());
    notice.setCategory("NOTICE");
    Post saved = posts.save(notice);
    audit(adminUsername, "PUBLISH_NOTICE", "POST", saved.getId(), saved.getTitle());
    return new AdminDtos.ModerationPostView(
        saved.getId(),
        saved.getTitle(),
        "NOTICE",
        admin.getUsername(),
        admin.getNickname(),
        0,
        saved.getCreatedAt());
  }

  @Transactional
  public void deleteCommunityPost(Long id, String adminUsername) {
    Post post = posts.findById(id).orElseThrow(() -> new EntityNotFoundException("Post not found"));
    String detail = post.getTitle();
    posts.delete(post);
    audit(adminUsername, "DELETE_COMMUNITY_POST", "POST", id, detail);
  }

  @Transactional
  public void deleteCommunityComment(Long id, String adminUsername) {
    PostComment comment =
        postComments
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Comment not found"));
    String detail = comment.getContent();
    postComments.delete(comment);
    audit(adminUsername, "DELETE_COMMUNITY_COMMENT", "POST_COMMENT", id, detail);
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

  private void restoreDeletedAccount(User target) {
    String originalUsername = target.getDeletedOriginalUsername();
    if (originalUsername == null || originalUsername.isBlank())
      throw new IllegalArgumentException("This deleted account has no restore snapshot");
    users
        .findByUsernameIgnoreCase(originalUsername)
        .filter(existing -> !existing.getId().equals(target.getId()))
        .ifPresent(
            existing -> {
              throw new IllegalArgumentException("The original username is already in use");
            });
    target.setUsername(originalUsername);
    target.setNickname(target.getDeletedOriginalNickname());
    target.setScore(
        target.getDeletedOriginalScore() == null ? 0 : target.getDeletedOriginalScore());
    target.setStatus(
        target.getDeletedOriginalStatus() == null ? "ACTIVE" : target.getDeletedOriginalStatus());
    target.setSuspensionReason(target.getDeletedOriginalSuspensionReason());
    target.setSuspendedAt(target.getDeletedOriginalSuspendedAt());
    target.setDeletedOriginalUsername(null);
    target.setDeletedOriginalNickname(null);
    target.setDeletedOriginalScore(null);
    target.setDeletedOriginalStatus(null);
    target.setDeletedOriginalSuspensionReason(null);
    target.setDeletedOriginalSuspendedAt(null);
    target.setDeletedAt(null);
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
