package com.minictf.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.minictf.common.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
public class RestSecurityHandlers {
  private final ObjectMapper objectMapper;

  public RestSecurityHandlers(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public void unauthorized(HttpServletResponse response) throws IOException {
    write(response, HttpServletResponse.SC_UNAUTHORIZED, "UNAUTHORIZED", "로그인이 필요합니다.");
  }

  public void sessionExpiredByOtherLogin(HttpServletResponse response) throws IOException {
    write(
        response,
        HttpServletResponse.SC_UNAUTHORIZED,
        "SESSION_EXPIRED_OTHER_LOGIN",
        "다른 기기에서 로그인되어 세션이 만료되었습니다.");
  }

  public void accountDeleted(HttpServletResponse response) throws IOException {
    write(response, HttpServletResponse.SC_UNAUTHORIZED, "ACCOUNT_DELETED", "계정이 삭제되었습니다.");
  }

  public void accountSuspended(HttpServletResponse response) throws IOException {
    write(response, HttpServletResponse.SC_UNAUTHORIZED, "ACCOUNT_SUSPENDED", "계정이 정지되었습니다.");
  }

  public void ipBanned(HttpServletResponse response) throws IOException {
    write(response, HttpServletResponse.SC_FORBIDDEN, "IP_BANNED", "이 IP 주소는 이용이 제한되었습니다.");
  }

  public void forbidden(HttpServletResponse response) throws IOException {
    write(response, HttpServletResponse.SC_FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
  }

  private void write(HttpServletResponse response, int status, String code, String message)
      throws IOException {
    response.setStatus(status);
    response.setCharacterEncoding("UTF-8");
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getWriter(), new ErrorResponse(code, message));
  }
}
