package com.minictf.admin;

import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Limited account moderation endpoints. Full administrators use the broader /api/admin API. */
@RestController
@RequestMapping("/api/moderation")
@PreAuthorize("hasRole('MODERATOR')")
public class ModeratorController {
  private final AdminModerationService service;

  public ModeratorController(AdminModerationService service) {
    this.service = service;
  }

  @GetMapping("/users")
  public ApiResponse<?> users() {
    return ApiResponse.ok(service.users());
  }

  @GetMapping("/notices")
  public ApiResponse<?> notices() {
    return ApiResponse.ok(
        service.communityPosts().stream()
            .filter(post -> "NOTICE".equals(post.category()))
            .toList());
  }

  @PostMapping("/notices")
  public ApiResponse<?> publishNotice(
      @Valid @RequestBody AdminDtos.NoticeRequest request, Authentication auth) {
    return ApiResponse.ok(service.publishNotice(request, auth.getName()));
  }

  @PostMapping("/users/{id}/score")
  public ApiResponse<?> adjustScore(
      @PathVariable Long id,
      @Valid @RequestBody AdminDtos.ScoreAdjustmentRequest request,
      Authentication auth) {
    return ApiResponse.ok(service.adjustScore(id, request, auth.getName()));
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
}
