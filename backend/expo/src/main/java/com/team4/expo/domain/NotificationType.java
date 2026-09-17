package com.team4.expo.domain;

// 알림 종류 (참가업체용 / 고객용 공용)
public enum NotificationType {
    BOOTH_APPROVED,         // (참가업체) 부스 신청 승인
    BOOTH_REJECTED,         // (참가업체) 부스 신청 반려
    CONSULTATION_RECEIVED,  // (참가업체) 신규 상담 접수
    CONSULTATION_APPROVED   // (고객) 상담 신청 확정(승인)
}
