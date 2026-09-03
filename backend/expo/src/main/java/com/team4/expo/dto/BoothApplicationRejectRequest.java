package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class BoothApplicationRejectRequest {

    @NotBlank
    private String reason;
}
