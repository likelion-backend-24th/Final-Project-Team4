package com.team4.expo.domain;

// 차량 상담(구매/시승) 신청 1건의 처리 상태.
public enum ConsultationStatus {
    REQUESTED,  // 접수(참가업체 심사 대기)
    APPROVED,   // 승인
    REJECTED    // 반려
}
