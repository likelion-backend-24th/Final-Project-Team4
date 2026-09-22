package com.team4.payment.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 취소표 내역 한 줄(당일 입장권 환불 1건)
@Getter
@AllArgsConstructor
public class RefundLogResponse {
    private final LocalDateTime refundedAt; // 환불 처리 시각
    private final long amount; // 환불 금액
    private final String refundReason; // 환불 사유
}
