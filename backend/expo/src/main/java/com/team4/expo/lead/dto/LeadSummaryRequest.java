package com.team4.expo.lead.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LeadSummaryRequest {

    @NotBlank
    private String consultationNote;
}
