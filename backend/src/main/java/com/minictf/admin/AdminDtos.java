package com.minictf.admin;

import jakarta.validation.constraints.*;
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

  public record ScoreAdjustmentRequest(
      @Min(-1_000_000) @Max(1_000_000) int amount, @NotBlank @Size(max = 500) String reason) {}

  public record CosmeticGrantRequest(
      @NotBlank @Size(max = 50) String cosmeticId, boolean granted) {}

  public record IpBanRequest(
      @NotBlank @Size(max = 45) String ipAddress, @NotBlank @Size(max = 500) String reason) {}

  public record UsernameIpBanRequest(
      @NotBlank @Size(max = 50) String username, @NotBlank @Size(max = 500) String reason) {}

  public record IpBanView(
      Long id, String ipAddress, String reason, String createdBy, Instant createdAt) {}

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

  public record ModerationPostView(
      Long id,
      String title,
      String category,
      String author,
      String authorNickname,
      long commentCount,
      Instant createdAt) {}

  public record ModerationCommentView(
      Long id,
      Long postId,
      String postTitle,
      String content,
      String author,
      String authorNickname,
      Instant createdAt) {}

  public record NoticeRequest(
      @NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 20_000) String content) {}

  public record Dashboard(
      List<UserView> users,
      List<SubmissionView> recentSubmissions,
      List<AntiCheatEventView> antiCheatEvents,
      List<AuditLogView> auditLogs,
      List<SecurityEventView> securityEvents) {}
}
