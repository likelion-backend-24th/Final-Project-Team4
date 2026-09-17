package com.team4.expo.client;

import java.time.LocalDate;
import java.util.List;

// Expo -> Reservation 내부 API 호출 계약. 상담 신청 접수 시점에 그 날짜 입장권(QR) 보유 여부를 확인하는 데 씀.
// 조회 자체가 실패/타임아웃되면 신청을 성공으로 열면 안 되므로(fail-closed), 구현체는 예외를 삼키지 않고 던진다.
public interface ReservationClient {
    boolean hasTicket(Long customerId, Long expoId, LocalDate visitDate);

    // 참가업체가 부스에서 고객 QR을 스캔해 리드를 만들 때 고객 식별용(TASK 11-2).
    // 유효하지 않거나 만료된 QR이면 CustomException(NOT_FOUND)을 던진다(업무상 404 - fail-closed 대상 아님).
    // 조회 자체가 실패/타임아웃되면 다른 메서드와 마찬가지로 예외를 삼키지 않고 던져 리드 생성을 막는다(fail-closed).
    TicketResolveResult resolveTicket(String qrToken);

    // 박람회 개최 기간(startsAt~endsAt) 변경 시 호출.
    // 새 기간 밖으로 벗어난 QR은 취소되고 QR을 발급받은 고객 전체 반환.
    List<ScheduleChangeTicket> applyScheduleChange(Long expoId, LocalDate newStartsAt, LocalDate newEndsAt);
}
