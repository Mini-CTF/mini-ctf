package com.minictf.config;

import com.minictf.admin.IpBanRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
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
    String ip = clientIp(request);
    String normalized = normalizeIp(ip);
    if (normalized != null && isBanned(normalized)) {
      handlers.ipBanned(response);
      return;
    }
    chain.doFilter(request, response);
  }

  private boolean isBanned(String normalizedIp) {
    if (bans.findByIpAddress(normalizedIp).isPresent()) return true;
    // Subnet check: /24 for IPv4, /64 for IPv6
    return bans.findAll().stream()
        .anyMatch(
            ban -> {
              String bannedNorm = normalizeIp(ban.getIpAddress());
              return bannedNorm != null && isSameSubnet(normalizedIp, bannedNorm);
            });
  }

  public static String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      String first = forwarded.split(",", 2)[0].trim();
      if (isValidIp(first)) return first;
    }
    String real = request.getHeader("X-Real-IP");
    if (real != null && !real.isBlank() && isValidIp(real.trim())) return real.trim();
    return request.getRemoteAddr();
  }

  public static String normalizeIp(String ip) {
    if (ip == null || ip.isBlank()) return null;
    try {
      return InetAddress.getByName(ip.trim()).getHostAddress();
    } catch (UnknownHostException e) {
      return ip.trim();
    }
  }

  private static boolean isValidIp(String ip) {
    try {
      InetAddress.getByName(ip);
      return true;
    } catch (UnknownHostException e) {
      return false;
    }
  }

  static boolean isSameSubnet(String ip1, String ip2) {
    try {
      byte[] a = InetAddress.getByName(ip1).getAddress();
      byte[] b = InetAddress.getByName(ip2).getAddress();
      if (a.length != b.length) return false;
      int prefix = a.length == 4 ? 3 : 8; // IPv4 /24 = 3 bytes, IPv6 /64 = 8 bytes
      for (int i = 0; i < prefix; i++) if (a[i] != b[i]) return false;
      return !java.util.Arrays.equals(a, b); // same subnet but not same IP (exact already checked)
    } catch (UnknownHostException e) {
      return false;
    }
  }
}
