package com.minictf.admin;

import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminModerationController {
  private final AdminModerationService service;

  public AdminModerationController(AdminModerationService service) {
    this.service = service;
  }

  @GetMapping("/dashboard")
  public ApiResponse<AdminDtos.Dashboard> dashboard() {
    return ApiResponse.ok(service.dashboard());
  }

  @GetMapping("/users")
  public ApiResponse<?> users() {
    return ApiResponse.ok(service.users());
  }

  @PatchMapping("/users/{id}")
  public ApiResponse<?> updateUser(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.UserUpdateRequest request,
      Authentication auth) {
    return ApiResponse.ok(service.updateNickname(id, request, auth.getName()));
  }

  @PostMapping("/users/{id}/score")
  public ApiResponse<?> adjustScore(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.ScoreAdjustmentRequest request,
      Authentication auth) {
    return ApiResponse.ok(service.adjustScore(id, request, auth.getName()));
  }

  @PostMapping("/users/{id}/cosmetics")
  public ApiResponse<?> setCosmetic(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.CosmeticGrantRequest request,
      Authentication auth) {
    return ApiResponse.ok(service.setCosmetic(id, request, auth.getName()));
  }

  @PostMapping("/users/{id}/suspend")
  public ApiResponse<?> suspend(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.SuspensionRequest request,
      Authentication auth) {
    return ApiResponse.ok(service.suspend(id, request, auth.getName()));
  }

  @PostMapping("/users/{id}/reinstate")
  public ApiResponse<?> reinstate(@PathVariable Long id, Authentication auth) {
    return ApiResponse.ok(service.reinstate(id, auth.getName()));
  }

  @DeleteMapping("/users/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deactivate(@PathVariable Long id, Authentication auth) {
    service.deactivate(id, auth.getName());
  }

  @DeleteMapping("/users/{id}/permanent")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void permanentlyDelete(@PathVariable Long id, Authentication auth) {
    service.permanentlyDelete(id, auth.getName());
  }

  @GetMapping("/ip-bans")
  public ApiResponse<?> ipBans() {
    return ApiResponse.ok(service.ipBans());
  }

  @PostMapping("/ip-bans")
  public ApiResponse<?> banIp(
      @Valid @RequestBody AdminDtos.IpBanRequest request, Authentication auth) {
    return ApiResponse.ok(service.banIp(request, auth.getName()));
  }

  @PostMapping("/ip-bans/by-username")
  public ApiResponse<?> banRegisteredIp(
      @Valid @RequestBody AdminDtos.UsernameIpBanRequest request, Authentication auth) {
    return ApiResponse.ok(service.banRegisteredIp(request, auth.getName()));
  }

  @DeleteMapping("/ip-bans/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void unbanIp(@PathVariable Long id, Authentication auth) {
    service.unbanIp(id, auth.getName());
  }

  @GetMapping("/submissions")
  public ApiResponse<?> submissions() {
    return ApiResponse.ok(service.submissions());
  }

  @GetMapping("/anti-cheat-events")
  public ApiResponse<?> antiCheatEvents() {
    return ApiResponse.ok(service.events());
  }

  @GetMapping("/audit-logs")
  public ApiResponse<?> auditLogs() {
    return ApiResponse.ok(service.logs());
  }

  @GetMapping("/security-events")
  public ApiResponse<?> securityEvents() {
    return ApiResponse.ok(service.securityEvents());
  }

  @GetMapping("/community/posts")
  public ApiResponse<?> communityPosts() {
    return ApiResponse.ok(service.communityPosts());
  }

  @GetMapping("/community/comments")
  public ApiResponse<?> communityComments() {
    return ApiResponse.ok(service.communityComments());
  }

  @PostMapping("/notices")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<?> publishNotice(
      @Valid @RequestBody AdminDtos.NoticeRequest request, Authentication auth) {
    return ApiResponse.ok(service.publishNotice(request, auth.getName()));
  }

  @DeleteMapping("/community/posts/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteCommunityPost(@PathVariable Long id, Authentication auth) {
    service.deleteCommunityPost(id, auth.getName());
  }

  @DeleteMapping("/community/comments/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteCommunityComment(@PathVariable Long id, Authentication auth) {
    service.deleteCommunityComment(id, auth.getName());
  }

  @PatchMapping("/audit-logs/{id}/redact")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void redactAuditLog(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.LogControlRequest request,
      Authentication auth) {
    service.redactAuditLog(id, request, auth.getName());
  }

  @DeleteMapping("/audit-logs/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void hideAuditLog(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.LogControlRequest request,
      Authentication auth) {
    service.hideAuditLog(id, request, auth.getName());
  }

  @PatchMapping("/security-events/{id}/redact")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void redactSecurityEvent(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.LogControlRequest request,
      Authentication auth) {
    service.redactSecurityEvent(id, request, auth.getName());
  }

  @DeleteMapping("/security-events/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void hideSecurityEvent(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.LogControlRequest request,
      Authentication auth) {
    service.hideSecurityEvent(id, request, auth.getName());
  }
}
