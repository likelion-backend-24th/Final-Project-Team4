package com.team4.identity.reservation.client;

public interface ReservationClient {

    // 회원 탈퇴 시 호출 - 고객이 보유한 모든 미사용 입장권(QR)은 강제 무효화
    // 환불은 이걸로 처리되지 않음(고객이 탈퇴와 별도로 직접 환불 신청) - QR의 입장 효력만 즉시 끊음
    void invalidateAllTickets(Long customerId);
}
