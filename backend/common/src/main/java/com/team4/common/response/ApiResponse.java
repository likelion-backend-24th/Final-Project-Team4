package com.team4.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
public class ApiResponse<T> {

    private final T data;
    private final ApiError error;

    private ApiResponse(T data, ApiError error) {
        this.data = data;
        this.error = error;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(data, null);
    }

    public static ApiResponse<Void> fail(ApiError error) {
        return new ApiResponse<>(null, error);
    }

    public static ApiResponse<Void> fail(String code, String message, String traceId) {
        return fail(new ApiError(code, message, traceId));
    }
}
