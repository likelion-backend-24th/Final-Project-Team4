package com.team4.identity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PasswordResetRequest {

    @NotBlank
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private final String email;
}
