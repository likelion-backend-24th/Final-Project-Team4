package com.team4.expo.domain;

// 부스 참가 신청 1건의 처리 상태.
// 예상 흐름: DRAFT(임시저장, 선택) -> SUBMITTED(접수) -> PAYMENT_PENDING(결제 대기, payment 서비스 연동 지점)
//          -> CONFIRMED(확정) 또는 REJECTED(반려). REFUND_REQUIRED는 확정 후 취소 시 사용.
public enum ApplicationStatus {
    DRAFT,                       //임시저장
    SUBMITTED,                  //접수
    PAYMENT_PENDING,            //결제 대기
    CONFIRMED,                  //확정
    REJECTED,                   //반려
    REFUND_REQUIRED,             //환불
    CANCELLED                    //취소(DRAFT/SUBMITTED 상태에서 신청 자체를 철회)
}
