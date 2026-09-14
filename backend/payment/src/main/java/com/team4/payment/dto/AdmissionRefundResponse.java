package com.team4.payment.dto;

import java.time.LocalDateTime;

public record AdmissionRefundResponse (
        Long ticketId,
        Long refundAmount,
        Long refundFee,
        String status,
        LocalDateTime refundedAt
) {}
