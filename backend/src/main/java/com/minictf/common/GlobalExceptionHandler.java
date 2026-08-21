package com.minictf.common;

import com.minictf.auth.AuthService;
import com.minictf.auth.AuthController;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(EntityNotFoundException ex) { return response(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage()); }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
    ResponseEntity<ErrorResponse> validation(Exception ex) { return response(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "입력 값이 조건을 만족하지 않습니다."); }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> badRequest(Exception ex) { return response(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "요청 값이 올바르지 않습니다."); }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> forbidden() { return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."); }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    ResponseEntity<ErrorResponse> unauthorized() { return response(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "로그인이 필요합니다."); }

    @ExceptionHandler(AuthService.InvalidCredentialsException.class)
    ResponseEntity<ErrorResponse> invalidCredentials() {
        return response(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    @ExceptionHandler(AuthService.DuplicateUsernameException.class)
    ResponseEntity<ErrorResponse> duplicateUsername() {
        return response(HttpStatus.CONFLICT, "USERNAME_EXISTS", "이미 사용 중인 username입니다.");
    }

    @ExceptionHandler(AuthController.OAuthProviderUnavailableException.class)
    ResponseEntity<ErrorResponse> oauthUnavailable() {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "OAUTH_PROVIDER_UNAVAILABLE", "설정되지 않은 OAuth 제공자입니다.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict() { return response(HttpStatus.CONFLICT, "CONFLICT", "중복되거나 충돌하는 데이터입니다."); }

    @ExceptionHandler(com.minictf.challenge.ChallengeService.InvalidFlagException.class)
    ResponseEntity<ErrorResponse> invalidFlag() { return response(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_FLAG", "FLAG가 올바르지 않습니다."); }

    @ExceptionHandler(RateLimitService.RateLimitedException.class)
    ResponseEntity<ErrorResponse> rateLimited(RateLimitService.RateLimitedException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(new ErrorResponse("RATE_LIMITED", "잠시 후 다시 시도해 주세요."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> internal(Exception ex) { log.error("Unhandled API failure",ex);return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 오류가 발생했습니다."); }

    private ResponseEntity<ErrorResponse> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(code, message));
    }
}
