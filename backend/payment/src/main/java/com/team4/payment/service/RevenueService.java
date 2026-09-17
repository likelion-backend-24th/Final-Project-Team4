package com.team4.payment.service;

import com.team4.payment.dto.RevenueResponse;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.repository.AdmissionPaymentRepository;
import com.team4.payment.repository.AdmissionPaymentTicketRepository;
import com.team4.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// 박람회별 매출 현황
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RevenueService {

    // 결제 총액 집계 대상 - 한 번이라도 결제 완료된 건
    private static final List<PaymentStatus> PAID_STATUSES = List.of(PaymentStatus.PAID, PaymentStatus.CANCELLED);

    private final PaymentRepository paymentRepository;
    private final AdmissionPaymentRepository admissionPaymentRepository;
    private final AdmissionPaymentTicketRepository admissionPaymentTicketRepository;

    public RevenueResponse getRevenue(Long expoId) {
        long boothFee = paymentRepository.sumAmountByExpoIdAndStatusIn(expoId, PAID_STATUSES);
        long dayTicket = admissionPaymentRepository.sumAmountByExpoIdAndStatusIn(expoId, PAID_STATUSES);

        // 부스 참가비 환불 - 전액 환불만 있으므로 CANCELLED 건 amount가 환불액
        long boothRefund = paymentRepository.sumAmountByExpoIdAndStatusIn(expoId, List.of(PaymentStatus.CANCELLED));

        // 당일 입장권 환불 - 날짜 단위 부분 환불, refundedAt 기준으로 합산
        long dayTicketRefund = admissionPaymentTicketRepository.sumRefundedAmountByExpoId(expoId);

        long refundTotal = boothRefund + dayTicketRefund;

        long netRevenue = boothFee + dayTicket - refundTotal;

        return new RevenueResponse(boothFee, dayTicket, refundTotal, netRevenue);
    }
}
