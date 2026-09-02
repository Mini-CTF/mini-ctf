package com.minictf.auth;

import com.minictf.common.ApiResponse;
import com.minictf.common.RateLimitService;
import com.minictf.config.IpBanFilter;
import com.minictf.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private static final List<String> PROVIDERS = List.of("google", "github", "discord", "naver");
  private final AuthService service;
  private final UserRepository users;
  private final RateLimitService rateLimits;
  private final ClientRegistrationRepository registrations;

  public AuthController(
      AuthService service,
      UserRepository users,
      RateLimitService rateLimits,
      ClientRegistrationRepository registrations) {
    this.service = service;
    this.users = users;
    this.rateLimits = rateLimits;
    this.registrations = registrations;
  }

  @PostMapping("/register")
  public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> register(
      @Valid @RequestBody AuthDtos.RegisterRequest req, HttpServletRequest http) {
    String ip = IpBanFilter.clientIp(http);
    String fp = http.getHeader("X-Device-Fingerprint");
    if (fp != null) fp = fp.trim();
    rateLimits.check("register", ip, 10, 60);
    if (fp != null && !fp.isBlank()) rateLimits.check("register-fp", fp, 5, 3600);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(service.register(req, ip, fp)));
  }

  @PostMapping("/login")
  public ApiResponse<AuthDtos.AuthResponse> login(
      @Valid @RequestBody AuthDtos.LoginRequest req, HttpServletRequest http) {
    String ip = IpBanFilter.clientIp(http);
    rateLimits.check("login", ip, 20, 60);
    return ApiResponse.ok(service.login(req, ip));
  }

  @PostMapping("/recovery/username")
  public ApiResponse<AuthDtos.RecoveryMessage> recoverUsername(
      @Valid @RequestBody AuthDtos.UsernameRecoveryRequest req, HttpServletRequest http) {
    rateLimits.check("recover-username", IpBanFilter.clientIp(http), 5, 60);
    return ApiResponse.ok(service.recoverUsername(req));
  }

  @PostMapping("/recovery/password")
  public ApiResponse<AuthDtos.RecoveryMessage> requestPasswordReset(
      @Valid @RequestBody AuthDtos.PasswordRecoveryRequest req, HttpServletRequest http) {
    rateLimits.check("recover-password", IpBanFilter.clientIp(http), 5, 60);
    return ApiResponse.ok(service.requestPasswordReset(req));
  }

  @PostMapping("/recovery/reset")
  public ApiResponse<AuthDtos.RecoveryMessage> resetPassword(
      @Valid @RequestBody AuthDtos.PasswordResetRequest req, HttpServletRequest http) {
    rateLimits.check("reset-password", IpBanFilter.clientIp(http), 8, 60);
    return ApiResponse.ok(service.resetPassword(req));
  }

  @GetMapping("/me")
  public ApiResponse<AuthDtos.UserView> me(Authentication auth) {
    return ApiResponse.ok(service.toView(users.findByUsername(auth.getName()).orElseThrow()));
  }

  @GetMapping("/oauth/{provider}/authorize")
  public ResponseEntity<Void> authorize(@PathVariable String provider) {
    String normalized = provider.toLowerCase();
    if (!PROVIDERS.contains(normalized)) return ResponseEntity.notFound().build();
    var registration = registrations.findByRegistrationId(normalized);
    if (registration == null
        || registration.getClientId() == null
        || registration.getClientId().isBlank()
        || "not-configured".equals(registration.getClientId()))
      throw new OAuthProviderUnavailableException();
    return ResponseEntity.status(HttpStatus.FOUND)
        .location(URI.create("/oauth2/authorization/" + normalized))
        .build();
  }

  @GetMapping("/oauth/providers")
  public ApiResponse<?> providers() {
    return ApiResponse.ok(
        PROVIDERS.stream()
            .filter(
                provider -> {
                  var r = registrations.findByRegistrationId(provider);
                  return r != null
                      && r.getClientId() != null
                      && !r.getClientId().isBlank()
                      && !"not-configured".equals(r.getClientId());
                })
            .toList());
  }

  public static class OAuthProviderUnavailableException extends RuntimeException {}
}
