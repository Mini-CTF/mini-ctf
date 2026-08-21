package com.minictf.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class AdminDtos {
  private AdminDtos() {}

  public record UserView(
      Long id,
      String username,
      String nickname,
      String role,
      String status,
      String suspensionReason,
      int score,
      Instant createdAt,
      Instant suspendedAt) {}

  public record UserUpdateRequest(@NotBlank @Size(max = 80) String nickname) {}

  public record SuspensionRequest(@NotBlank @Size(max = 500) String reason) {}

  public record SubmissionView(
      String username, String challengeTitle, boolean correct, Instant submittedAt) {}

  public record AntiCheatEventView(
      Long id,
      String username,
      String challengeTitle,
      String eventType,
      String severity,
      String detail,
      Instant createdAt) {}

  public record AuditLogView(
      Long id,
      String adminUsername,
      String action,
      String targetType,
      Long targetId,
      String detail,
      Instant createdAt) {}

  public record SecurityEventView(
      Long id,
      String username,
      String eventType,
      String subject,
      String detail,
      Instant createdAt,
      Instant redactedAt) {}

  public record LogControlRequest(@NotBlank @Size(max = 500) String reason) {}

  public record Dashboard(
      List<UserView> users,
      List<SubmissionView> recentSubmissions,
      List<AntiCheatEventView> antiCheatEvents,
      List<AuditLogView> auditLogs,
      List<SecurityEventView> securityEvents) {}
}
