package com.minictf.social;

import com.minictf.common.ApiResponse;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social")
public class SocialController {
  private final SocialService service;
  private final UserRepository users;

  public SocialController(SocialService service, UserRepository users) {
    this.service = service;
    this.users = users;
  }

  @GetMapping("/friends")
  public ApiResponse<?> friends(Authentication auth) {
    return ApiResponse.ok(service.friends(current(auth)));
  }

  @PostMapping("/friends/{username}")
  public ResponseEntity<ApiResponse<?>> request(
      @PathVariable @Pattern(regexp = "[A-Za-z0-9_]{3,50}") String username,
      Authentication auth,
      jakarta.servlet.http.HttpServletRequest http) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(service.request(current(auth), username, http.getRemoteAddr())));
  }

  @PostMapping("/friends/{username}/accept")
  public ApiResponse<?> accept(
      @PathVariable @Pattern(regexp = "[A-Za-z0-9_]{3,50}") String username, Authentication auth) {
    return ApiResponse.ok(service.accept(current(auth), username));
  }

  @DeleteMapping("/friends/{username}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@PathVariable String username, Authentication auth) {
    service.remove(current(auth), username);
  }

  @GetMapping("/messages/{username}")
  public ApiResponse<?> messages(@PathVariable String username, Authentication auth) {
    return ApiResponse.ok(service.conversation(current(auth), username));
  }

  @PostMapping("/messages/{username}")
  public ResponseEntity<ApiResponse<?>> send(
      @PathVariable String username,
      @Valid @RequestBody SocialDtos.MessageRequest request,
      Authentication auth,
      jakarta.servlet.http.HttpServletRequest http) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(service.send(current(auth), username, request, http.getRemoteAddr())));
  }

  private User current(Authentication auth) {
    return users.findByUsernameIgnoreCase(auth.getName()).orElseThrow();
  }
}
