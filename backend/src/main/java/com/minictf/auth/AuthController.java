package com.minictf.auth;

import com.minictf.common.ApiResponse;
import com.minictf.common.RateLimitService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.Set;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Set<String> PROVIDERS=Set.of("google","github","kakao","naver");
    private final AuthService service; private final UserRepository users; private final RateLimitService rateLimits; private final ClientRegistrationRepository registrations;
    public AuthController(AuthService service, UserRepository users, RateLimitService rateLimits,ClientRegistrationRepository registrations) { this.service=service; this.users=users; this.rateLimits=rateLimits;this.registrations=registrations; }
    @PostMapping("/register") public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> register(@Valid @RequestBody AuthDtos.RegisterRequest req, HttpServletRequest http) {
        rateLimits.check("register", http.getRemoteAddr(), 10, 60);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.register(req)));
    }
    @PostMapping("/login") public ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest req, HttpServletRequest http) {
        rateLimits.check("login", http.getRemoteAddr(), 20, 60);
        return ApiResponse.ok(service.login(req));
    }
    @GetMapping("/me") public ApiResponse<AuthDtos.UserView> me(Authentication auth) { return ApiResponse.ok(service.toView(users.findByUsername(auth.getName()).orElseThrow())); }
    @GetMapping("/oauth/{provider}/authorize") public ResponseEntity<Void> authorize(@PathVariable String provider) {
        String normalized=provider.toLowerCase();
        if (!PROVIDERS.contains(normalized)) return ResponseEntity.notFound().build();
        var registration=registrations.findByRegistrationId(normalized);
        if(registration==null||registration.getClientId()==null||registration.getClientId().isBlank()||"not-configured".equals(registration.getClientId()))throw new OAuthProviderUnavailableException();
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create("/oauth2/authorization/"+normalized)).build();
    }
    @GetMapping("/oauth/providers") public ApiResponse<?> providers(){return ApiResponse.ok(PROVIDERS.stream().filter(provider->{var r=registrations.findByRegistrationId(provider);return r!=null&&r.getClientId()!=null&&!r.getClientId().isBlank()&&!"not-configured".equals(r.getClientId());}).sorted().toList());}
    public static class OAuthProviderUnavailableException extends RuntimeException{}
}
