package com.minictf.auth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {
  private static final Logger log = LoggerFactory.getLogger(OAuth2LoginFailureHandler.class);
  private static final String FLAGBOX_PRODUCTION_CALLBACK =
      "https://frontend-mini-ctf.vercel.app/auth/callback";
  private final String redirect;

  public OAuth2LoginFailureHandler(
      @Value("${app.oauth.failure-redirect:http://localhost:5173/auth/callback}") String redirect) {
    this.redirect = redirect;
  }

  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
      throws IOException, ServletException {
    String code =
        exception instanceof OAuth2AuthenticationException oauth
            ? oauth.getError().getErrorCode()
            : "oauth_login_failed";
    String detail =
        exception instanceof OAuth2AuthenticationException oauth
            ? oauth.getError().getDescription()
            : exception.getMessage();
    if (request.getRequestURI().endsWith("/discord")
        && detail != null
        && detail.contains("429 Too Many Requests")) {
      code = "discord_rate_limited";
    }
    log.warn("OAuth login failed path={} code={} detail={}", request.getRequestURI(), code, detail);
    String callbackRedirect = callbackRedirect(request);
    String separator = callbackRedirect.contains("?") ? "&" : "?";
    response.sendRedirect(
        callbackRedirect
            + separator
            + "oauthError="
            + URLEncoder.encode(code, StandardCharsets.UTF_8));
  }

  private String callbackRedirect(HttpServletRequest request) {
    // Do not let a stale preview URL in Render's environment hide a useful
    // OAuth error from the user on a different frontend deployment.
    return request.getServerName().endsWith(".onrender.com")
        ? FLAGBOX_PRODUCTION_CALLBACK
        : redirect;
  }
}
