package com.team4.expo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class BoothApplicationRequest {

    @NotNull
    private Long boothId;

    @NotNull
    @Valid
    private CompanyInfoRequest companyInfo;
}
