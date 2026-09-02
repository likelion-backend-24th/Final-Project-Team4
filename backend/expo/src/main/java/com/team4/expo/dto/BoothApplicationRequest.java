package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class BoothApplicationRequest {

    @NotNull
    private Long boothId;

    @NotBlank
    private String exhibitionItem;

    @NotBlank
    private String conceptDescription;

    private boolean powerRequested;
    private boolean waterSupplyRequested;
    private boolean internetRequested;

    private String additionalRequest;
}
