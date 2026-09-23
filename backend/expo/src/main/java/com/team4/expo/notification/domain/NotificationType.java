package com.team4.expo.notification.domain;

// 알림 종류 (참가업체용 / 고객용 공용)
public enum NotificationType {
    BOOTH_APPROVED,         // (참가업체) 부스 신청 승인
    BOOTH_REJECTED,         // (참가업체) 부스 신청 반려
    CONSULTATION_RECEIVED,  // (참가업체) 신규 상담 접수
    CONSULTATION_APPROVED,  // (고객) 상담 신청 확정(승인)
    EXPO_TICKET_CANCELLED,  // (고객) 박람회 개최 기간 변경으로 기존 QR(방문예약)이 취소됨
    EXPO_SCHEDULE_CHANGED   // (고객) 박람회 개최 기간이 변경됐지만 기존 QR은 그대로 유효함
}
