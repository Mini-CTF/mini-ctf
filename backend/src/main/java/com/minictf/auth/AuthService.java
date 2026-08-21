package com.minictf.auth;

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

  public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
  }

  @Transactional
  public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
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
    return issue(users.save(user));
  }

  @Transactional(readOnly = true)
  public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
    User user =
        users
            .findByUsernameIgnoreCase(request.username().trim())
            .orElseThrow(InvalidCredentialsException::new);
    if (user.getPasswordHash() == null
        || !encoder.matches(request.password(), user.getPasswordHash()))
      throw new InvalidCredentialsException();
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

  public static class DuplicateUsernameException extends RuntimeException {}
}
