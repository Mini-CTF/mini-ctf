package com.minictf.auth;

import com.minictf.admin.SecurityEventService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {
  private static final String FLAGBOX_PRODUCTION_CALLBACK =
      "https://frontend-mini-ctf.vercel.app/auth/callback";
  private final OAuthAccountRepository accounts;
  private final UserRepository users;
  private final AuthService authService;
  private final String redirect;
  private final SecurityEventService securityEvents;

  public OAuth2LoginSuccessHandler(
      OAuthAccountRepository accounts,
      UserRepository users,
      AuthService authService,
      SecurityEventService securityEvents,
      @Value("${app.oauth.success-redirect}") String redirect) {
    this.accounts = accounts;
    this.users = users;
    this.authService = authService;
    this.securityEvents = securityEvents;
    this.redirect = redirect;
  }

  @Override
  @Transactional
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication)
      throws IOException, ServletException {
    OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
    OAuth2User principal = token.getPrincipal();
    String provider = token.getAuthorizedClientRegistrationId().toLowerCase();
    String subject = providerValue(principal, provider, "id");
    if (subject == null || subject.isBlank()) {
      response.sendError(400, "OAuth subject is missing");
      return;
    }
    User user =
        accounts
            .findByProviderAndProviderSubject(provider, subject)
            .map(OAuthAccount::getUser)
            .orElseGet(() -> create(provider, subject, principal));
    if (!"ACTIVE".equals(user.getStatus())) {
      response.sendError(403, "This account is suspended");
      return;
    }
    securityEvents.record(
        user, "OAUTH_LOGIN_SUCCESS", user.getUsername(), request.getRemoteAddr(), provider);
    response.sendRedirect(
        callbackRedirect(request)
            + "#token="
            + URLEncoder.encode(authService.issueOAuthSession(user), StandardCharsets.UTF_8));
  }

  private String callbackRedirect(HttpServletRequest request) {
    // Render is the production OAuth callback host.  Always return to the
    // canonical production frontend here: an old preview URL in an
    // environment variable must never send a successfully authenticated user
    // to a stale Vercel deployment.
    return request.getServerName().endsWith(".onrender.com")
        ? FLAGBOX_PRODUCTION_CALLBACK
        : redirect;
  }

  private User create(String provider, String subject, OAuth2User principal) {
    String username = provider + "_" + hash(subject);
    User user = new User();
    user.setUsername(username);
    user.setNickname(first(providerValue(principal, provider, "nickname"), username));
    user.setRole("USER");
    user.setScore(0);
    user = users.save(user);
    OAuthAccount account = new OAuthAccount();
    account.setUser(user);
    account.setProvider(provider);
    account.setProviderSubject(subject);
    accounts.save(account);
    return user;
  }

  private static String attribute(OAuth2User user, String... keys) {
    for (String key : keys) {
      Object v = user.getAttributes().get(key);
      if (v != null && !v.toString().isBlank()) return v.toString();
    }
    return null;
  }

  private static String nested(OAuth2User user, String parent, String... keys) {
    Object raw = user.getAttributes().get(parent);
    if (!(raw instanceof java.util.Map<?, ?> map)) return null;
    for (String key : keys) {
      Object value = map.get(key);
      if (value instanceof java.util.Map<?, ?> child) {
        Object nickname = child.get("nickname");
        if (nickname != null) return nickname.toString();
      }
      if (value != null && !value.toString().isBlank()) return value.toString();
    }
    return null;
  }

  private static String providerValue(OAuth2User user, String provider, String purpose) {
    if ("id".equals(purpose)) {
      if ("google".equals(provider)) return attribute(user, "sub");
      if ("naver".equals(provider)) return nested(user, "response", "id");
      return attribute(user, "id");
    }
    if ("naver".equals(provider))
      return first(
          nested(user, "response", "nickname", "name", "email"), attribute(user, "name", "email"));
    if ("discord".equals(provider)) return attribute(user, "global_name", "username", "email");
    return attribute(user, "name", "login", "nickname", "email");
  }

  private static String first(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }

  private static String hash(String value) {
    try {
      byte[] bytes =
          MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder s = new StringBuilder();
      for (byte b : bytes) s.append(String.format("%02x", b));
      return s.substring(0, 24);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
