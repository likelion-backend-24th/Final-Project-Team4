package com.team4.common.response;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

// 시큐리티 필터 등 @RestControllerAdvice 밖에서 표준 에러 envelope 를 응답에 직접 쓸 때
public final class ObjectMapperWriter {

    private ObjectMapperWriter() {}

    public static void write(HttpServletResponse response, ErrorCode errorCode, String traceId,
                             ObjectMapper objectMapper) throws IOException {
        response.setStatus(errorCode.httpStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        if (errorCode.httpStatus() == 401) {
            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        }

        ApiResponse<Void> error = ApiResponse.fail(errorCode.name(), errorCode.defaultMessage(), traceId);
        objectMapper.writeValue(response.getWriter(), error);
    }
}
