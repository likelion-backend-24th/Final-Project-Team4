package com.team4.reservation.domain;

public enum TicketStatus {
    ISSUED,    // 발급됨, 아직 체크인 전
    USED,      // 체크인에 사용됨(최종 상태, 재사용 불가)
    CANCELLED  // 아직 발급 로직에서 안 씀. 환불/탈퇴 등으로 QR을 강제 무효화할 때를 대비해 남겨둔 상태값.
}
