package com.team4.payment.entity;

public enum PaymentStatus {
    PENDING,    // 결제 대기
    PAID,       // 결제 완료
    FAILED,     // 실패
    CANCELLED   // 결제 취소
}
