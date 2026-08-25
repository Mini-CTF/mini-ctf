package com.minictf.auth;

import com.minictf.user.UserRepository;
import com.minictf.config.RestSecurityHandlers;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwt;
  private final UserRepository users;
  private final RestSecurityHandlers handlers;

  public JwtAuthenticationFilter(JwtService jwt, UserRepository users, RestSecurityHandlers handlers) {
    this.jwt = jwt;
    this.users = users;
    this.handlers = handlers;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        var claims = jwt.parse(header.substring(7));
        Long userId = Long.valueOf(claims.getSubject());
        Object rawSessionVersion = claims.get("sessionVersion");
        long tokenSessionVersion =
            rawSessionVersion instanceof Number number ? number.longValue() : Long.MIN_VALUE;
        users
            .findById(userId)
            .ifPresent(
                user -> {
                  if (tokenSessionVersion != user.getAuthSessionVersion()) {
                    try {
                      SecurityContextHolder.clearContext();
                      handlers.sessionExpiredByOtherLogin(response);
                    } catch (IOException exception) {
                      throw new SessionInvalidatedException(exception);
                    }
                    throw new SessionInvalidatedException();
                  } else if ("ACTIVE".equals(user.getStatus()))
                    SecurityContextHolder.getContext()
                        .setAuthentication(
                            new UsernamePasswordAuthenticationToken(
                                user.getUsername(),
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))));
                });
      } catch (SessionInvalidatedException exception) {
        return;
      } catch (RuntimeException ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    chain.doFilter(request, response);
  }

  private static class SessionInvalidatedException extends RuntimeException {
    SessionInvalidatedException() {}

    SessionInvalidatedException(IOException cause) {
      super(cause);
    }
  }
}
