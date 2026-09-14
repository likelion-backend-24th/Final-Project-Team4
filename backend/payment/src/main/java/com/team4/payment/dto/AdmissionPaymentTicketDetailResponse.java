package com.team4.payment.dto;

import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.AdmissionPaymentTicket;
import java.time.LocalDate;
import java.time.LocalDateTime;

// 마이페이지 "나의 입장권" > 결제 내역 보기 모달에서 쓰는 특정 티켓 1건의 결제 상세.
// amount는 이 티켓(날짜) 1건분 금액이지 결제 전체 금액(여러 날짜 합산)이 아님.
public record AdmissionPaymentTicketDetailResponse (
        Long ticketId,
        Long expoId,
        LocalDate visitDate,
        Long amount,
        String payMethod,
        String paymentNo,
        String status, // PAID | CANCELLED | REFUNDED (이 티켓 기준 — 결제 전체 상태와 다를 수 있음)
        LocalDateTime paidAt,
        LocalDateTime refundedAt,
        String refundReason
) {
    public static AdmissionPaymentTicketDetailResponse of(AdmissionPayment payment, AdmissionPaymentTicket ticket) {
        String status = ticket.isRefunded() ? "REFUNDED" : payment.getStatus().name();
        return new AdmissionPaymentTicketDetailResponse(
                ticket.getTicketId(),
                payment.getExpoId(),
                ticket.getVisitDate(),
                ticket.getAmount(),
                payment.getPayMethod(),
                payment.getPortonePaymentId(),
                status,
                payment.getApprovedAt(),
                ticket.getRefundedAt(),
                ticket.getRefundReason()
        );
    }
}
