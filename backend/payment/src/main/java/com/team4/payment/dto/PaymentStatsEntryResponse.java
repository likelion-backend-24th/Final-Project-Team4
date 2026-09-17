package com.team4.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

// 일별 결제, 환불 통계 한 행(source별로 나뉜 시계열의 한 항목)
@Getter
@AllArgsConstructor
public class PaymentStatsEntryResponse {
    private final LocalDate date;
    private final String source;
    private final long paidCount;
    private final long paidAmount;
    private final long refundCount;
    private final long refundAmount;
    private final long net;
}
