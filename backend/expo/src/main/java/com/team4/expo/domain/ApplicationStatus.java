package com.team4.expo.domain;

// 부스 참가 신청 1건의 처리 상태.
// 예상 흐름: SUBMITTED(접수) -> PAYMENT_PENDING(결제 대기, payment 서비스 연동 지점)
//          -> CONFIRMED(확정) 또는 REJECTED(반려). REFUND_REQUIRED는 확정 후 취소 시 사용.
// 다만 지금 구현된 건 applyBooth()에서 SUBMITTED로 저장하는 것뿐이고, 나머지 상태 전이
// (결제 완료, 승인/반려, 취소)를 처리하는 코드는 아직 없음.
public enum ApplicationStatus {
    SUBMITTED,                  //접수
    PAYMENT_PENDING,            //결제 대기
    CONFIRMED,                  //확정
    REJECTED,                   //반려
    REFUND_REQUIRED             //환불
}