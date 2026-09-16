package com.team4.payment.dto;

import java.time.LocalDateTime;

// 참가업체 부스 신청취소 환불 응답
public record BoothRefundResponse(
        String bookingId,
        Long refundAmount,
        String status,
        LocalDateTime refundedAt
) {}
