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
    private static final Set<String> PROVIDERS=Set.of("google","github","kakao","naver");
    private final AuthService service; private final UserRepository users;
    public AuthController(AuthService service, UserRepository users) { this.service=service; this.users=users; }
    @PostMapping("/register") public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> register(@Valid @RequestBody AuthDtos.RegisterRequest req) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.register(req))); }
    @PostMapping("/login") public ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest req) { return ApiResponse.ok(service.login(req)); }
    @GetMapping("/me") public ApiResponse<AuthDtos.UserView> me(Authentication auth) { return ApiResponse.ok(service.toView(users.findByUsername(auth.getName()).orElseThrow())); }
    @GetMapping("/oauth/{provider}/authorize") public ResponseEntity<Void> authorize(@PathVariable String provider) {
        if (!PROVIDERS.contains(provider.toLowerCase())) return ResponseEntity.notFound().build();
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create("/oauth2/authorization/"+provider.toLowerCase())).build();
    }
}
