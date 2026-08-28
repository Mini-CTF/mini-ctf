package com.minictf.auth;

import com.minictf.admin.SecurityEventService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final SecurityEventService securityEvents;
  private final PasswordResetTokenRepository resetTokens;
  private final ObjectProvider<JavaMailSender> mailSender;
  private final String resetUrl;
  private final String mailFrom;

  public AuthService(
      UserRepository users,
      PasswordEncoder encoder,
      JwtService jwt,
      SecurityEventService securityEvents,
      PasswordResetTokenRepository resetTokens,
      ObjectProvider<JavaMailSender> mailSender,
      @Value("${app.account-recovery.reset-url:http://localhost:5173/login}") String resetUrl,
      @Value("${app.account-recovery.from:}") String mailFrom) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
    this.securityEvents = securityEvents;
    this.resetTokens = resetTokens;
    this.mailSender = mailSender;
    this.resetUrl = resetUrl;
    this.mailFrom = mailFrom;
  }

  @Transactional
  public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request, String ip) {
    if (!request.password().equals(request.passwordConfirmation()))
      throw new IllegalArgumentException("비밀번호 확인이 일치하지 않습니다.");
    String username = request.username().trim();
    if (users.existsByUsernameIgnoreCase(username)
        || users.existsByDeletedOriginalUsernameIgnoreCase(username))
      throw new DuplicateUsernameException();
    User user = new User();
    user.setUsername(username);
    user.setNickname(
        request.nickname() == null || request.nickname().isBlank()
            ? username
            : request.nickname().trim());
    user.setPasswordHash(encoder.encode(request.password()));
    user.setEmail(request.email().trim().toLowerCase());
    user.setRole("USER");
    user.setScore(0);
    User saved = users.save(user);
    securityEvents.record(
        saved, "ACCOUNT_REGISTERED", saved.getUsername(), ip, "Local account created");
    return issueNewSession(saved.getId());
  }

  @Transactional
  public AuthDtos.RecoveryMessage recoverUsername(AuthDtos.UsernameRecoveryRequest request) {
    String email = request.email().trim().toLowerCase();
    users.findByEmailIgnoreCase(email).filter(user -> user.getPasswordHash() != null).ifPresent(user ->
        sendMail(email, "FlagBox 아이디 안내", "FlagBox에서 사용하는 아이디는 @" + user.getUsername() + " 입니다."));
    return new AuthDtos.RecoveryMessage("입력한 이메일로 안내를 보냈습니다. OAuth 로그인 계정은 이 기능을 사용할 수 없습니다.");
  }

  @Transactional
  public AuthDtos.RecoveryMessage requestPasswordReset(AuthDtos.PasswordRecoveryRequest request) {
    String email = request.email().trim().toLowerCase();
    users.findByUsernameIgnoreCase(request.username().trim())
        .filter(user -> user.getPasswordHash() != null && email.equalsIgnoreCase(user.getEmail()))
        .ifPresent(user -> {
          resetTokens.deleteByUserId(user.getId());
          String raw = newResetToken();
          PasswordResetToken token = new PasswordResetToken();
          token.setUser(user);
          token.setTokenHash(sha256(raw));
          token.setExpiresAt(Instant.now().plus(20, ChronoUnit.MINUTES));
          resetTokens.save(token);
          sendMail(email, "FlagBox 비밀번호 재설정", "아래 링크는 20분 동안만 유효합니다.\n" + resetUrl + "?resetToken=" + raw);
        });
    return new AuthDtos.RecoveryMessage("계정 정보가 일치하면 비밀번호 재설정 링크를 이메일로 보냈습니다.");
  }

  @Transactional
  public AuthDtos.RecoveryMessage resetPassword(AuthDtos.PasswordResetRequest request) {
    if (!request.password().equals(request.passwordConfirmation()))
      throw new IllegalArgumentException("비밀번호 확인이 일치하지 않습니다.");
    PasswordResetToken token = resetTokens.findByTokenHashAndUsedAtIsNull(sha256(request.token())).orElseThrow(() -> new IllegalArgumentException("재설정 링크가 유효하지 않습니다."));
    if (token.getExpiresAt().isBefore(Instant.now())) throw new IllegalArgumentException("재설정 링크가 만료되었습니다.");
    User user = users.findByIdForUpdate(token.getUser().getId()).orElseThrow();
    user.setPasswordHash(encoder.encode(request.password()));
    user.setAuthSessionVersion(user.getAuthSessionVersion() + 1);
    token.setUsedAt(Instant.now());
    securityEvents.record(user, "PASSWORD_RESET", user.getUsername(), null, "Password reset by email token");
    return new AuthDtos.RecoveryMessage("비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.");
  }

  private void sendMail(String to, String subject, String body) {
    JavaMailSender sender = mailSender.getIfAvailable();
    if (sender == null || mailFrom.isBlank()) {
      throw new AccountRecoveryUnavailableException();
    }
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(mailFrom);
    message.setTo(to);
    message.setSubject(subject);
    message.setText(body);
    try {
      sender.send(message);
    } catch (org.springframework.mail.MailException exception) {
      throw new AccountRecoveryUnavailableException(exception);
    }
  }

  private static String newResetToken() {
    byte[] raw = new byte[32];
    new SecureRandom().nextBytes(raw);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
  }

  private static String sha256(String value) {
    try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    catch (java.security.NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
  }

  @Transactional
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
    return issueNewSession(user.getId());
  }

  public AuthDtos.AuthResponse issueNewSession(Long userId) {
    User user = users.findByIdForUpdate(userId).orElseThrow();
    user.setAuthSessionVersion(user.getAuthSessionVersion() + 1);
    return new AuthDtos.AuthResponse(
        jwt.createToken(user.getId(), user.getRole(), user.getAuthSessionVersion()), toView(user));
  }

  public String issueOAuthSession(User user) {
    return issueNewSession(user.getId()).token();
  }

  public AuthDtos.UserView toView(User user) {
    return new AuthDtos.UserView(
        user.getId(), user.getUsername(), user.getNickname(), user.getRole(), user.getScore());
  }

  public static class InvalidCredentialsException extends RuntimeException {}

  public static class AccountSuspendedException extends RuntimeException {}

  public static class DuplicateUsernameException extends RuntimeException {}

  /** The recovery feature is enabled only after a production mail sender is configured. */
  public static class AccountRecoveryUnavailableException extends RuntimeException {
    AccountRecoveryUnavailableException() {
      super("이메일 발송 설정이 아직 완료되지 않았습니다.");
    }

    AccountRecoveryUnavailableException(Exception cause) {
      super("이메일 발송 설정을 확인해 주세요.", cause);
    }
  }
}
