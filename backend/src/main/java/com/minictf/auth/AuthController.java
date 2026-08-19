package com.minictf.auth;

import com.minictf.common.ApiResponse;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Set<String> SUPPORTED_PROVIDERS = Set.of("google", "github", "kakao", "naver");
    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(authService.register(request)));
    }

    @PostMapping("/login")
    public ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ApiResponse<AuthDtos.UserView> me(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        return ApiResponse.ok(authService.toView(user));
    }

    @GetMapping("/oauth/{provider}/authorize")
    public ResponseEntity<Void> authorize(@PathVariable String provider) {
        if (!SUPPORTED_PROVIDERS.contains(provider.toLowerCase())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create("/oauth2/authorization/" + provider.toLowerCase()))
                .build();
    }

    @GetMapping("/oauth/{provider}/callback")
    public ResponseEntity<ApiResponse<String>> callback(@PathVariable String provider) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ApiResponse.ok("OAuth provider 설정 후 Spring Security callback을 사용합니다."));
    }
}
