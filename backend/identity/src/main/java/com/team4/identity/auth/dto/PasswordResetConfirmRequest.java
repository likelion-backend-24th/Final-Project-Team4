package com.team4.identity.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PasswordResetConfirmRequest{

    @NotBlank
    private final String token; // 재설정 링크의 토큰

    @NotBlank
    @Size(min = 8, max = 64, message = "비밀번호는 8자 이상이어야 합니다.")
    private final String newPassword; // 새 비밀번호
}
