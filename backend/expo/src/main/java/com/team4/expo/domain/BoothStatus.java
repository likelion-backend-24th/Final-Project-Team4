package com.team4.expo.domain;

// 개별 부스(Booth 1 row = 실물 부스 1개)의 배정 상태.
public enum BoothStatus {
    AVAILABLE, // 예약 가능
    RESERVED,  // 관리자 승인 완료, 결제 대기 중 (이 상태에서는 다른 업체가 신청 불가)
    ASSIGNED   // 결제 완료, 참가 확정
}
