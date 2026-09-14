package com.team4.payment.client;

import java.time.LocalDate;
import java.util.List;

public interface ReservationClient {
    // 요청한 날짜들 중 이미 티켓이 있어 결제 대상에서 빼야 하는 날짜(blockedDates)와 1일 입장 금액 조회
    AdmissionContext getAdmissionContext(Long customerId, Long expoId, List<LocalDate> visitDates);

    // 유료 입장권 결제 완료 직후 호출 — 선택한 날짜 수만큼 실제 티켓(QR) 발급
    List<AdmissionTicket> issueAdmissionTicket(Long customerId, Long expoId, List<LocalDate> visitDates);

    // 환불 처리 중 호출 - 해당 티켓(QR)을 강제 무효화(CANCELLED)한다.
    // true = 무효화 성공(이미 CANCELLED였던 경우 포함, 멱등). false = 이미 체크인(USED)돼 있어 취소 불가.
    boolean cancelTicket(Long ticketId);
}
