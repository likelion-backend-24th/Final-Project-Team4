package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LeadSendInfoRequest {

    @NotBlank
    private String emailBody;
}
