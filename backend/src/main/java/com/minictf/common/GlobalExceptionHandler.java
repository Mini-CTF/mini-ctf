package com.minictf.common;

import com.minictf.challenge.ChallengeService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(EntityNotFoundException ex) { return response(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage()); }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class, IllegalArgumentException.class})
    ResponseEntity<ErrorResponse> badRequest(Exception ex) { return response(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "요청 값이 올바르지 않습니다."); }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> forbidden() { return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."); }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict() { return response(HttpStatus.CONFLICT, "CONFLICT", "중복되거나 충돌하는 데이터입니다."); }

    @ExceptionHandler(ChallengeService.InvalidFlagException.class)
    ResponseEntity<ErrorResponse> invalidFlag() { return response(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_FLAG", "FLAG가 올바르지 않습니다."); }

    @ExceptionHandler(ChallengeService.RateLimitedException.class)
    ResponseEntity<ErrorResponse> rateLimited() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header(HttpHeaders.RETRY_AFTER, "60")
                .body(new ErrorResponse("RATE_LIMITED", "잠시 후 다시 시도해 주세요."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> internal() { return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 오류가 발생했습니다."); }

    private ResponseEntity<ErrorResponse> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(code, message));
    }
}
