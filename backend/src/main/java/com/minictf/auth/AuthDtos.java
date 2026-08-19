package com.minictf.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotBlank @Size(min = 8, max = 100) String passwordConfirmation,
            @Size(max = 80) String nickname) {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record UserView(Long id, String username, String nickname, String role, int score) {}

    public record AuthResponse(String token, UserView user) {}
}
