package com.team4.payment.client;

import java.time.LocalDate;

public interface ReservationClient {
    // 고객의 해당 박람회 무료 QR 입장권 보유 여부와, 당일 입장 금액 조회
    AdmissionContext getAdmissionContext(Long customerId, Long expoId);

    // 당일 유료 입장권 결제 완료 직후 호출 — 실제 티켓(QR) 발급
    AdmissionTicket issueAdmissionTicket(Long customerId, Long expoId, LocalDate visitDate);
}
