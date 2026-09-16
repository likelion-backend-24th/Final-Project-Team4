package com.team4.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 환불 요청 - 사유
@AllArgsConstructor
@Getter
public class RefundRequest {
    @NotBlank
    private final String reason;
}
