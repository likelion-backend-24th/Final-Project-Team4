package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class BoothApplicationRequest {

    @NotNull
    private Long boothId;

    @NotBlank
    private String exhibitItem;

    @NotBlank
    private String conceptDescription;

    private boolean facilityPower;
    private boolean facilityWater;
    private boolean facilityInternet;

    private String additionalRequest;
}
