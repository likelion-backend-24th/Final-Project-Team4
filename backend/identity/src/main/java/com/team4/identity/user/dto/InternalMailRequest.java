package com.team4.identity.user.dto;

import jakarta.validation.constraints.NotBlank;

// Expo -> Identity 내부 메일 발송 요청(TASK 11-4)
public record InternalMailRequest(
        @NotBlank String to,
        @NotBlank String subject,
        @NotBlank String body
) {
}
