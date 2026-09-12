package com.team4.expo.domain;

// 차량 상담(구매/시승) 신청 1건의 처리 상태.
public enum ConsultationStatus {
    REQUESTED,  // 접수(참가업체 심사 대기)
    APPROVED,   // 승인
    REJECTED,   // 반려
    CANCELED,   // 고객이 직접 취소(REQUESTED 상태에서만 가능)
    COMPLETED,  // 참가업체가 방문/상담 완료 처리(APPROVED, 방문 예정일 다음날부터)
    NO_SHOW     // 참가업체가 미방문 처리(APPROVED, 방문 예정일 다음날부터)
}
