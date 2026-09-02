package com.team4.expo.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.team4.expo.domain.ExpoStatus;
import lombok.Getter;

// 박람회 등록/공개 API 공통 응답.
@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
public class ExpoResponse {

    private final Long expoId;
    private final ExpoStatus status;
    private final Integer boothCount;

    public ExpoResponse(Long expoId, ExpoStatus status, Integer boothCount) {
        this.expoId = expoId;
        this.status = status;
        this.boothCount = boothCount;
    }
}