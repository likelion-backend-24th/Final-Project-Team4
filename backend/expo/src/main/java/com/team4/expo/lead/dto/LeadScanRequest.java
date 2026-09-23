package com.team4.expo.lead.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LeadScanRequest {

    @NotBlank
    private String qrToken;
}
