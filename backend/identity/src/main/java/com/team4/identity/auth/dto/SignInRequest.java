package com.team4.identity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.AllArgsConstructor;

@Getter
@AllArgsConstructor
public class SignInRequest {

    @NotBlank
    @Email
    private final String email;

    @NotBlank
    private final String password;
}
