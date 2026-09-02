package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;


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