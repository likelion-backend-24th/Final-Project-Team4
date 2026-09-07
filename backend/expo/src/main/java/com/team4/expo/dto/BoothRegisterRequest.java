package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;


// ExpoRegisterRequest에 포함되는 부스 1건 등록 정보
@Getter
public class BoothRegisterRequest {

    @NotBlank
    private String boothNo;

    @NotBlank
    private String type;

    @NotNull
    @Positive
    private Integer fee;
}