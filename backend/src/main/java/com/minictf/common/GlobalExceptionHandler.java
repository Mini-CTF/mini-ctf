package com.minictf.common;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.HttpHeaders;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class, IllegalArgumentException.class})
    ResponseEntity<ErrorResponse> badRequest(Exception ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_INPUT", "요청 값이 올바르지 않습니다."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse("FORBIDDEN", "접근 권한이 없습니다."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("CONFLICT", "중복되거나 충돌하는 데이터입니다."));
    }

    @ExceptionHandler(com.minictf.challenge.ChallengeService.InvalidFlagException.class)
    ResponseEntity<ErrorResponse> invalidFlag() {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(new ErrorResponse("INVALID_FLAG", "FLAG가 올바르지 않습니다."));
    }

    @ExceptionHandler(com.minictf.challenge.ChallengeService.RateLimitedException.class)
    ResponseEntity<ErrorResponse> rateLimited() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, "60")
                .body(new ErrorResponse("RATE_LIMITED", "잠시 후 다시 시도해 주세요."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> internal(Exception ex) {
        log.error("Unhandled API exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다."));
    }
}
