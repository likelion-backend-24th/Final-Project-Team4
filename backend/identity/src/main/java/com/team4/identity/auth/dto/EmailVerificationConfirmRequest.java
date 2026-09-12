package com.team4.identity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EmailVerificationConfirmRequest {

    @NotBlank
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private final String email;

    @NotBlank
    private final String code; // 발송된 6자리 인증 코드
}
