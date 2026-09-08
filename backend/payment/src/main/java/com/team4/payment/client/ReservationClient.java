package com.team4.payment.client;

import java.time.LocalDateTime;

public interface ReservationClient {
    // 고객의 해당 박람회 무료 QR 입장권 보유 여부와, 당일 입장 금액 조회
    AdmissionContext getAdmissionContext(Long customerId, Long expoId);

    // 당일 입장권 결제 완료 통보.
    void confirmAdmissionPayment(Long customerId, Long expoId, String paymentId, LocalDateTime paidAt);
}
