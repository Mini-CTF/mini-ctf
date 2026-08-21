package com.minictf.auth;

import com.minictf.admin.SecurityEventService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final SecurityEventService securityEvents;

  public AuthService(
      UserRepository users,
      PasswordEncoder encoder,
      JwtService jwt,
      SecurityEventService securityEvents) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
    this.securityEvents = securityEvents;
  }

  @Transactional
  public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request, String ip) {
    if (!request.password().equals(request.passwordConfirmation()))
      throw new IllegalArgumentException("비밀번호 확인이 일치하지 않습니다.");
    String username = request.username().trim();
    if (users.existsByUsernameIgnoreCase(username)) throw new DuplicateUsernameException();
    User user = new User();
    user.setUsername(username);
    user.setNickname(
        request.nickname() == null || request.nickname().isBlank()
            ? username
            : request.nickname().trim());
    user.setPasswordHash(encoder.encode(request.password()));
    user.setRole("USER");
    user.setScore(0);
    User saved = users.save(user);
    securityEvents.record(
        saved, "ACCOUNT_REGISTERED", saved.getUsername(), ip, "Local account created");
    return issue(saved);
  }

  @Transactional(readOnly = true)
  public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request, String ip) {
    User user =
        users
            .findByUsernameIgnoreCase(request.username().trim())
            .orElseThrow(InvalidCredentialsException::new);
    if (!"ACTIVE".equals(user.getStatus())) {
      securityEvents.recordIndependent(
          user, "LOGIN_BLOCKED", user.getUsername(), ip, "Suspended account");
      throw new AccountSuspendedException();
    }
    if (user.getPasswordHash() == null
        || !encoder.matches(request.password(), user.getPasswordHash())) {
      securityEvents.recordIndependent(
          user, "LOGIN_FAILED", user.getUsername(), ip, "Invalid password");
      throw new InvalidCredentialsException();
    }
    securityEvents.recordIndependent(
        user, "LOGIN_SUCCESS", user.getUsername(), ip, "Local password login");
    return issue(user);
  }

  public AuthDtos.AuthResponse issue(User user) {
    return new AuthDtos.AuthResponse(jwt.createToken(user.getId(), user.getRole()), toView(user));
  }

  public AuthDtos.UserView toView(User user) {
    return new AuthDtos.UserView(
        user.getId(), user.getUsername(), user.getNickname(), user.getRole(), user.getScore());
  }

  public static class InvalidCredentialsException extends RuntimeException {}

  public static class AccountSuspendedException extends RuntimeException {}

  public static class DuplicateUsernameException extends RuntimeException {}
}
