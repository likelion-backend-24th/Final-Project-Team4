package com.team4.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 박람회별 매출 현황(부스 참가비/당일 입장권 구분, 환불 차감 순매출)
@Getter
@AllArgsConstructor
public class RevenueResponse {
    private final Long boothFee;
    private final Long dayTicket;
    private final Long refundTotal;
    private final Long netRevenue;
}
