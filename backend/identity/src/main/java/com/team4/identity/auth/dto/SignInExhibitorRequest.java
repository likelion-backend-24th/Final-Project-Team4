package com.team4.identity.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SignInExhibitorRequest {

    @NotBlank
    private final String businessNo;

    @NotBlank
    private final String password;
}
