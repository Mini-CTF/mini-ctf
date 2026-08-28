package com.minictf.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
  private AuthDtos() {}

  public record RegisterRequest(
      @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "^[A-Za-z0-9_]+$") String username,
      @NotBlank @Size(min = 8, max = 100) String password,
      @NotBlank @Size(min = 8, max = 100) String passwordConfirmation,
      @Size(max = 80) String nickname,
      @NotBlank @Size(max = 254) @jakarta.validation.constraints.Email String email) {}

  public record LoginRequest(
      @NotBlank @Size(max = 50) String username, @NotBlank @Size(max = 100) String password) {}

  public record UserView(Long id, String username, String nickname, String role, int score) {}

  public record AuthResponse(String token, UserView user) {}

  public record UsernameRecoveryRequest(
      @NotBlank @Size(max = 254) @jakarta.validation.constraints.Email String email) {}

  public record PasswordRecoveryRequest(
      @NotBlank @Size(max = 50) String username,
      @NotBlank @Size(max = 254) @jakarta.validation.constraints.Email String email) {}

  public record PasswordResetRequest(
      @NotBlank @Size(min = 32, max = 200) String token,
      @NotBlank @Size(min = 8, max = 100) String password,
      @NotBlank @Size(min = 8, max = 100) String passwordConfirmation) {}

  public record RecoveryMessage(String message) {}
}
