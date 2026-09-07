package com.team4.payment.client;

public interface ReservationClient {
    // 고객의 해당 박람회 무료 QR 입장권 보유 여부와, 당일 입장 금액 조회
    AdmissionContext getAdmissionContext(Long customerId, Long expoId);
}
