package com.team4.payment.repository;

import java.time.LocalDateTime;

// 취소표 내역 한 줄(당일 입장권 환불 1건) 조회 결과
public interface RefundLog {
    LocalDateTime getRefundedAt();
    Long getAmount();
    String getRefundReason();
}
