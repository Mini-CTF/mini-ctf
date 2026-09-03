package com.minictf.admin;

import com.minictf.anticheat.AntiCheatEventRepository;
import com.minictf.attendance.AttendanceCheckinRepository;
import com.minictf.challenge.SolveRepository;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.community.Post;
import com.minictf.community.PostComment;
import com.minictf.community.PostCommentRepository;
import com.minictf.community.PostRepository;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminModerationService {
  private final UserRepository users;
  private final SubmissionRepository submissions;
  private final SolveRepository solves;
  private final AntiCheatEventRepository antiCheatEvents;
  private final AdminAuditLogRepository auditLogs;
  private final SecurityEventRepository securityEvents;
  private final PostRepository posts;
  private final PostCommentRepository postComments;
  private final IpBanRepository ipBans;
  private final AttendanceCheckinRepository attendanceCheckins;

  public AdminModerationService(
      UserRepository users,
      SubmissionRepository submissions,
      SolveRepository solves,
      AntiCheatEventRepository antiCheatEvents,
      AdminAuditLogRepository auditLogs,
      SecurityEventRepository securityEvents,
      PostRepository posts,
      PostCommentRepository postComments,
      IpBanRepository ipBans,
      AttendanceCheckinRepository attendanceCheckins) {
    this.users = users;
    this.submissions = submissions;
    this.solves = solves;
    this.antiCheatEvents = antiCheatEvents;
    this.auditLogs = auditLogs;
    this.securityEvents = securityEvents;
    this.posts = posts;
    this.postComments = postComments;
    this.ipBans = ipBans;
    this.attendanceCheckins = attendanceCheckins;
  }

  @Transactional(readOnly = true)
  public AdminDtos.Dashboard dashboard() {
    return new AdminDtos.Dashboard(
        users(), submissions(40), events(40), logs(40), securityEvents(40));
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.UserView> users() {
    return users.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
        .limit(100)
        .map(this::userView)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.AccountLogView> accountLogs(Long targetId, String actorUsername) {
    User target = target(targetId);
    ensureCanViewAccountLogs(actorUsername, target);
    List<AdminDtos.AccountLogView> logs = new ArrayList<>();
    submissions
        .findByUserId(targetId, PageRequest.of(0, 25))
        .forEach(
            submission ->
                logs.add(
                    new AdminDtos.AccountLogView(
                        submission.isCorrect() ? "SUBMISSION_CORRECT" : "SUBMISSION_INCORRECT",
                        submission.getChallengeTitle(),
                        submission.getSubmittedAt())));
    solves.findByUserId(targetId).stream()
        .limit(25)
        .forEach(
            solve ->
                logs.add(
                    new AdminDtos.AccountLogView(
                        "SOLVED", solve.getChallengeTitle(), solve.getSolvedAt())));
    attendanceCheckins.findByUserIdOrderByCheckinDateDesc(targetId).stream()
        .limit(25)
        .forEach(
            checkin ->
                logs.add(
                    new AdminDtos.AccountLogView(
                        "CHECK_IN",
                        checkin.getCheckinDate().toString(),
                        checkin.getCheckedInAt())));
    securityEvents
        .findTop25ByUserIdAndHiddenFalseOrderByCreatedAtDesc(targetId)
        .forEach(
            event ->
                logs.add(
                    new AdminDtos.AccountLogView(
                        "SECURITY_" + event.getEventType(),
                        event.getDetail(),
                        event.getCreatedAt())));
    auditLogs
        .findTop25ByTargetTypeAndTargetIdAndHiddenFalseOrderByCreatedAtDesc("USER", targetId)
        .forEach(
            log ->
                logs.add(
                    new AdminDtos.AccountLogView(
                        "ADMIN_" + log.getAction(), log.getDetail(), log.getCreatedAt())));
    return logs.stream()
        .sorted(Comparator.comparing(AdminDtos.AccountLogView::occurredAt).reversed())
        .limit(50)
        .toList();
  }

  @Transactional
  public AdminDtos.UserView updateNickname(
      Long targetId, AdminDtos.UserUpdateRequest request, String adminUsername) {
    User target = target(targetId);
    ensureCanManage(adminUsername, target, false);
    if ("DELETED".equals(target.getStatus()))
      throw new IllegalArgumentException("Restore the account before editing it");
    target.setNickname(request.nickname().trim());
    audit(adminUsername, "UPDATE_USER", "USER", targetId, "Updated nickname");
    return userView(target);
  }

  @Transactional
  public AdminDtos.UserView updateModeratorRole(
      Long targetId, AdminDtos.RoleUpdateRequest request, String adminUsername) {
    User target = targetForUpdate(targetId);
    if (target.getUsername().equalsIgnoreCase(adminUsername))
      throw new IllegalArgumentException("You cannot change your own administrator role");
    ensureNotAdmin(target);
    target.setRole(request.role());
    target.setAuthSessionVersion(target.getAuthSessionVersion() + 1);
    audit(
        adminUsername,
        "UPDATE_MODERATOR_ROLE",
        "USER",
        targetId,
        "Role changed to " + request.role());
    return userView(target);
  }

  @Transactional
  public AdminDtos.UserView adjustScore(
      Long targetId, AdminDtos.ScoreAdjustmentRequest request, String adminUsername) {
    User target = targetForUpdate(targetId);
    ensureCanAdjustScore(adminUsername, target);
    if (!"ACTIVE".equals(target.getStatus()))
      throw new IllegalArgumentException("Restore the account before adjusting its score");
    int previous = target.getScore();
    long next = (long) previous + request.amount();
    if (next < 0 || next > 1_000_000)
      throw new IllegalArgumentException("The resulting score must be between 0 and 1,000,000");
    target.setScore((int) next);
    users.saveAndFlush(target);
    audit(
        adminUsername,
        "ADJUST_SCORE",
        "USER",
        targetId,
        "Score " + previous + " -> " + next + "; " + request.reason().trim());
    return userView(target);
  }

  @Transactional
  public AdminDtos.UserView suspend(
      Long targetId, AdminDtos.SuspensionRequest request, String adminUsername) {
    User target = target(targetId);
    ensureCanManage(adminUsername, target, false);
    target.setStatus("SUSPENDED");
    target.setSuspensionReason(request.reason().trim());
    target.setSuspendedAt(Instant.now());
    target.setAuthSessionVersion(target.getAuthSessionVersion() + 1);
    audit(adminUsername, "SUSPEND_USER", "USER", targetId, target.getSuspensionReason());
    return userView(target);
  }

  @Transactional
  public AdminDtos.UserView reinstate(Long targetId, String adminUsername) {
    User target = target(targetId);
    ensureCanManage(adminUsername, target, "DELETED".equals(target.getStatus()));
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
  public AdminDtos.UserView deactivate(Long targetId, String adminUsername) {
    User target = target(targetId);
    ensureNotAdmin(target);
    if ("DELETED".equals(target.getStatus())) return userView(target);
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
    target.setAuthSessionVersion(target.getAuthSessionVersion() + 1);
    target.setScore(0);
    target.setNickname("Deleted user");
    target.setUsername("deleted_" + target.getId());
    audit(
        adminUsername,
        "DEACTIVATE_USER",
        "USER",
        targetId,
        "Account data hidden and progress reset; reversible restore is available");
    return userView(target);
  }

  @Transactional
  public void permanentlyDelete(Long targetId, String adminUsername) {
    User target = target(targetId);
    ensureNotAdmin(target);
    if (!"DELETED".equals(target.getStatus()))
      throw new IllegalArgumentException("Only a soft-deleted account can be permanently deleted");
    Long id = target.getId();
    // Submissions and solves intentionally keep strict foreign keys; remove them explicitly.
    submissions.deleteByUserId(id);
    solves.deleteByUserId(id);
    users.delete(target);
    audit(adminUsername, "PERMANENTLY_DELETE_USER", "USER", id, "Irreversible account purge");
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.SubmissionView> submissions() {
    return submissions(100);
  }

  @Transactional(readOnly = true)
  public List<AdminDtos.IpBanView> ipBans() {
    return ipBans.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
        .map(
            ban ->
                new AdminDtos.IpBanView(
                    ban.getId(),
                    ban.getIpAddress(),
                    ban.getReason(),
                    ban.getCreatedBy(),
                    ban.getCreatedAt()))
        .toList();
  }

  @Transactional
  public AdminDtos.IpBanView banIp(AdminDtos.IpBanRequest request, String adminUsername) {
    String raw = request.ipAddress().trim();
    String ip = com.minictf.config.IpBanFilter.normalizeIp(raw);
    if (ip == null || ip.isBlank()) throw new IllegalArgumentException("유효한 IP 주소를 입력해 주세요.");
    try {
      java.net.InetAddress.getByName(ip);
    } catch (java.net.UnknownHostException e) {
      throw new IllegalArgumentException("유효한 IP 주소를 입력해 주세요.");
    }
    IpBan ban = ipBans.findByIpAddress(ip).orElseGet(IpBan::new);
    ban.setIpAddress(ip);
    ban.setReason(request.reason().trim());
    ban.setCreatedBy(adminUsername);
    IpBan saved = ipBans.save(ban);
    audit(adminUsername, "BAN_IP", "IP", saved.getId(), ip + ": " + saved.getReason());
    return new AdminDtos.IpBanView(
        saved.getId(),
        saved.getIpAddress(),
        saved.getReason(),
        saved.getCreatedBy(),
        saved.getCreatedAt());
  }

  @Transactional
  public AdminDtos.IpBanView banRegisteredIp(
      AdminDtos.UsernameIpBanRequest request, String adminUsername) {
    String username = request.username().trim();
    User target =
        users
            .findByUsernameIgnoreCase(username)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
    ensureNotAdmin(target);
    SecurityEvent registration =
        securityEvents
            .findFirstByUserIdAndEventTypeInAndIpAddressIsNotNullOrderByCreatedAtAsc(
                target.getId(), Set.of("ACCOUNT_REGISTERED", "OAUTH_LOGIN", "OAUTH_LOGIN_SUCCESS"))
            .filter(event -> !event.getIpAddress().isBlank())
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "This account has no saved registration IP address"));
    AdminDtos.IpBanView result =
        banIp(
            new AdminDtos.IpBanRequest(registration.getIpAddress(), request.reason()),
            adminUsername);
    target.setStatus("SUSPENDED");
    target.setSuspensionReason("Account ban: " + request.reason().trim());
    target.setSuspendedAt(Instant.now());
    target.setAuthSessionVersion(target.getAuthSessionVersion() + 1);
    audit(
        adminUsername,
        "BAN_USER_REGISTRATION_IP",
        "USER",
        target.getId(),
        username + " suspended and IP banned -> " + registration.getIpAddress());
    return result;
  }

  @Transactional
  public void unbanIp(Long id, String adminUsername) {
    IpBan ban =
        ipBans.findById(id).orElseThrow(() -> new EntityNotFoundException("IP ban not found"));
    String ip = ban.getIpAddress();
    ipBans.delete(ban);
    audit(adminUsername, "UNBAN_IP", "IP", id, ip);
  }

  private List<AdminDtos.SubmissionView> submissions(int limit) {
    return submissions.findAllWithActiveUsers(page(limit)).stream()
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
    return events(100);
  }

  private List<AdminDtos.AntiCheatEventView> events(int limit) {
    return antiCheatEvents.findWithActiveUsers(page(limit)).stream()
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
    return logs(100);
  }

  private List<AdminDtos.AuditLogView> logs(int limit) {
    return auditLogs.findVisibleWithAdmin(page(limit)).stream()
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
    return securityEvents(100);
  }

  private List<AdminDtos.SecurityEventView> securityEvents(int limit) {
    return securityEvents.findVisible(page(limit)).stream()
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

  private PageRequest page(int limit) {
    return PageRequest.of(0, Math.max(1, Math.min(limit, 100)));
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

  private User targetForUpdate(Long id) {
    return users
        .findByIdForUpdate(id)
        .orElseThrow(() -> new EntityNotFoundException("User not found"));
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

  private void ensureCanManage(String actorUsername, User target, boolean deletedAccount) {
    User actor = users.findByUsernameIgnoreCase(actorUsername).orElseThrow();
    ensureNotAdmin(target);
    if ("MODERATOR".equals(actor.getRole())
        && (deletedAccount || !"USER".equals(target.getRole()))) {
      throw new AccessDeniedException("Limited administrators can only moderate active users");
    }
  }

  private void ensureCanAdjustScore(String actorUsername, User target) {
    User actor = users.findByUsernameIgnoreCase(actorUsername).orElseThrow();
    if ("ADMIN".equals(target.getRole())) {
      if ("ADMIN".equals(actor.getRole()) && actor.getId().equals(target.getId())) return;
      throw new AccessDeniedException("Only the primary administrator can adjust their own score");
    }
    ensureCanManage(actorUsername, target, false);
  }

  private void ensureCanViewAccountLogs(String actorUsername, User target) {
    User actor = users.findByUsernameIgnoreCase(actorUsername).orElseThrow();
    if ("MODERATOR".equals(actor.getRole()) && !"USER".equals(target.getRole()))
      throw new AccessDeniedException("Limited administrators can only view user activity logs");
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
