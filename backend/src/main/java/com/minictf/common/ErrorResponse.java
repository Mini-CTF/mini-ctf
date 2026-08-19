package com.minictf.common;

public record ErrorResponse(boolean success, ErrorBody error) {
    public ErrorResponse(String code, String message) { this(false, new ErrorBody(code, message)); }
    public record ErrorBody(String code, String message) {}
}
