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
}
