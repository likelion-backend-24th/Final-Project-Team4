package com.team4.expo.client;

import java.time.LocalDate;

// Expo -> Reservation 내부 API 호출 계약. 상담 신청 접수 시점에 그 날짜 입장권(QR) 보유 여부를 확인하는 데 씀.
// 조회 자체가 실패/타임아웃되면 신청을 성공으로 열면 안 되므로(fail-closed), 구현체는 예외를 삼키지 않고 던진다.
public interface ReservationClient {
    boolean hasTicket(Long customerId, Long expoId, LocalDate visitDate);
}
