package com.minictf.config;

import com.minictf.admin.IpBanRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class IpBanFilter extends OncePerRequestFilter {
  private final IpBanRepository bans;
  private final RestSecurityHandlers handlers;

  public IpBanFilter(IpBanRepository bans, RestSecurityHandlers handlers) {
    this.bans = bans;
    this.handlers = handlers;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return HttpMethod.OPTIONS.matches(request.getMethod());
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (bans.findByIpAddress(clientIp(request)).isPresent()) {
      handlers.ipBanned(response);
      return;
    }
    chain.doFilter(request, response);
  }

  public static String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",", 2)[0].trim();
    return request.getRemoteAddr();
  }
}
