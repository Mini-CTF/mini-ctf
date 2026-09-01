package com.minictf.common;

import com.minictf.auth.AuthController;
import com.minictf.auth.AuthService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(EntityNotFoundException.class)
  ResponseEntity<ErrorResponse> notFound(EntityNotFoundException ex) {
    return response(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    ConstraintViolationException.class,
    HandlerMethodValidationException.class
  })
  ResponseEntity<ErrorResponse> validation(Exception ex) {
    return response(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "입력 값이 조건을 만족하지 않습니다.");
  }

  @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
  ResponseEntity<ErrorResponse> badRequest(Exception ex) {
    return response(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "요청 값이 올바르지 않습니다.");
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ErrorResponse> forbidden() {
    return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
  }

  @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
  ResponseEntity<ErrorResponse> unauthorized() {
    return response(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "로그인이 필요합니다.");
  }

  @ExceptionHandler(AuthService.InvalidCredentialsException.class)
  ResponseEntity<ErrorResponse> invalidCredentials() {
    return response(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  @ExceptionHandler(AuthService.AccountSuspendedException.class)
  ResponseEntity<ErrorResponse> accountSuspended() {
    return response(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "This account has been suspended.");
  }

  @ExceptionHandler(AuthService.AccountRegistrationLimitException.class)
  ResponseEntity<ErrorResponse> accountRegistrationLimit() {
    return response(
        HttpStatus.TOO_MANY_REQUESTS,
        "ACCOUNT_REGISTRATION_LIMIT",
        "같은 접속 환경에서는 계정을 최대 3개까지 만들 수 있습니다.");
  }

  @ExceptionHandler(AccountNameSafety.UnsafeAccountNameException.class)
  ResponseEntity<ErrorResponse> unsafeAccountName() {
    return response(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "UNSAFE_ACCOUNT_NAME",
        "아이디와 표시 이름에는 비속어나 공격적인 표현을 사용할 수 없습니다.");
  }

  @ExceptionHandler(AuthService.DuplicateUsernameException.class)
  ResponseEntity<ErrorResponse> duplicateUsername() {
    return response(HttpStatus.CONFLICT, "USERNAME_EXISTS", "이미 사용 중인 username입니다.");
  }

  @ExceptionHandler(AuthService.AccountRecoveryUnavailableException.class)
  ResponseEntity<ErrorResponse> accountRecoveryUnavailable(
      AuthService.AccountRecoveryUnavailableException ex) {
    log.warn("Account recovery requested without a usable mail sender", ex);
    return response(
        HttpStatus.SERVICE_UNAVAILABLE,
        "ACCOUNT_RECOVERY_UNAVAILABLE",
        "이메일 발송 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.");
  }

  @ExceptionHandler(AuthController.OAuthProviderUnavailableException.class)
  ResponseEntity<ErrorResponse> oauthUnavailable() {
    return response(
        HttpStatus.SERVICE_UNAVAILABLE, "OAUTH_PROVIDER_UNAVAILABLE", "설정되지 않은 OAuth 제공자입니다.");
  }

  @ExceptionHandler(com.minictf.assistant.AssistantService.AssistantUnavailableException.class)
  ResponseEntity<ErrorResponse> assistantUnavailable() {
    return response(
        HttpStatus.SERVICE_UNAVAILABLE,
        "ASSISTANT_UNAVAILABLE",
        "AI 도우미가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.");
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ErrorResponse> conflict() {
    return response(HttpStatus.CONFLICT, "CONFLICT", "중복되거나 충돌하는 데이터입니다.");
  }

  @ExceptionHandler(com.minictf.challenge.ChallengeService.InvalidFlagException.class)
  ResponseEntity<ErrorResponse> invalidFlag() {
    return response(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_FLAG", "FLAG가 올바르지 않습니다.");
  }

  @ExceptionHandler(com.minictf.challenge.ChallengeService.ArtifactStorageException.class)
  ResponseEntity<ErrorResponse> artifactStorage(
      com.minictf.challenge.ChallengeService.ArtifactStorageException ex) {
    log.error("Challenge artifact storage failure", ex);
    return response(
        HttpStatus.SERVICE_UNAVAILABLE,
        "ARTIFACT_STORAGE_UNAVAILABLE",
        "문제 파일 저장소에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<ErrorResponse> unreadableRequest(HttpMessageNotReadableException ex) {
    return response(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "요청 형식이 올바르지 않습니다.");
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  ResponseEntity<ErrorResponse> unsupportedMethod(HttpRequestMethodNotSupportedException ex) {
    return response(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다.");
  }

  @ExceptionHandler(RateLimitService.RateLimitedException.class)
  ResponseEntity<ErrorResponse> rateLimited(RateLimitService.RateLimitedException ex) {
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
        .body(new ErrorResponse("RATE_LIMITED", "잠시 후 다시 시도해 주세요."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ErrorResponse> internal(Exception ex) {
    log.error("Unhandled API failure", ex);
    return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 오류가 발생했습니다.");
  }

  private ResponseEntity<ErrorResponse> response(HttpStatus status, String code, String message) {
    return ResponseEntity.status(status).body(new ErrorResponse(code, message));
  }
}
