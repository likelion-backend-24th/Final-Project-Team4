package com.team4.payment.dto;

import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;

import java.time.LocalDateTime;

public record PaymentListItemResponse(
        String bookingId,
        Long expoId,
        Long amount,
        PaymentStatus status,
        String payMethod,
        LocalDateTime approvedAt,
        LocalDateTime cancelledAt,
        String cancelReason
) {
    public static PaymentListItemResponse from(Payment payment){
        return new PaymentListItemResponse(
                payment.getBookingId(),
                payment.getExpoId(),
                payment.getExpoId(),
                payment.getStatus(),
                payment.getPayMethod(),
                payment.getApprovedAt(),
                payment.getCancelledAt(),
                payment.getCancelReason()
        );
    }
}
