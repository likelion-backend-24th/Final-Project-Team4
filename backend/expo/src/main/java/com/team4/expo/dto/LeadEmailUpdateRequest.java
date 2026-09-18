package com.team4.expo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LeadEmailUpdateRequest {

    @NotBlank
    @Email
    private String customerEmail;
}
