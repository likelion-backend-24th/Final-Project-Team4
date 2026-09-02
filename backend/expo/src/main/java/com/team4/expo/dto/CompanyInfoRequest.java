package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class CompanyInfoRequest {

    @NotBlank
    private String companyName;

    @NotBlank
    private String managerName;

    @NotBlank
    private String contact;

    private String intro;
}
