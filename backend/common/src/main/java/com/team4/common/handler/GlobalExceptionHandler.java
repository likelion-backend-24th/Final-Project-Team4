package com.team4.common.handler;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// 전역 예외 핸들러
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String TRACE_ID_HEADER = "X-Trace-Id";

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustom(CustomException e, HttpServletRequest request) {
        return build(e.errorCode(), e.getMessage(), request);
    }

    // Validation 예외
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e, HttpServletRequest request) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElseGet(ErrorCode.VALIDATION_ERROR::defaultMessage);
        return build(ErrorCode.VALIDATION_ERROR, message, request);
    }

    // X-User-Id 등 필수 헤더가 없을 때 — 신원 정보 자체가 없으므로 401(미인증)로 처리.
    // (이전엔 catch-all에 걸려 500으로 응답됐음, ExpoExhibitorController.applyBooth TODO 참고)
    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingHeader(MissingRequestHeaderException e, HttpServletRequest request) {
        return build(ErrorCode.UNAUTHENTICATED, ErrorCode.UNAUTHENTICATED.defaultMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e, HttpServletRequest request) {
        log.error("unhandled exception [{}]", traceId(request), e);
        return build(ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.defaultMessage(), request);
    }

    private ResponseEntity<ApiResponse<Void>> build(ErrorCode code, String message, HttpServletRequest request) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(code.httpStatus());
        if (code.httpStatus() == 401) {
            builder.header(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        }

        return builder.body(ApiResponse.fail(code.name(), message, traceId(request)));
    }

    private String traceId(HttpServletRequest request) {
        return request.getHeader(TRACE_ID_HEADER);
    }
}
