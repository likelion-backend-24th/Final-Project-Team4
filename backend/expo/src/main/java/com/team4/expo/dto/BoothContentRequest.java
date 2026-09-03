package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class BoothContentRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;
}
