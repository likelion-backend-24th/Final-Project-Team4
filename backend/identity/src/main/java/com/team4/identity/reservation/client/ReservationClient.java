package com.team4.identity.reservation.client;

import java.util.List;

public interface ReservationClient {

    // 회원 탈퇴 시 호출 - 고객이 보유한 모든 미사용 입장권(QR)은 강제 무효화
    // 환불은 이걸로 처리되지 않음(고객이 탈퇴와 별도로 직접 환불 신청) - QR의 입장 효력만 즉시 끊음
    void invalidateAllTickets(Long customerId);

    // 관리자 회원(참관객) 목록/엑셀 화면 - 체크인 여부·최종 입장일 표시용. 화면을 막으면 안 되는 조회라 fail-open:
    // 구현체는 실패해도 예외를 던지지 않고 빈 목록을 돌려준다(호출부가 전부 "미체크인"으로 처리).
    List<CustomerCheckInStatus> getCheckInStatuses(List<Long> customerIds);
}