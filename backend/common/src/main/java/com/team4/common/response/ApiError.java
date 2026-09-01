package com.team4.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
public class ApiError {

    private final String code;
    private final String message;
    private final String traceId;

    public ApiError(String code, String message, String traceId) {
        this.code = code;
        this.message = message;
        this.traceId = traceId;
    }
}
