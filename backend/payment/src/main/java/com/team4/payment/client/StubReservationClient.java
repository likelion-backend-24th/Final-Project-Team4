package com.team4.payment.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Primary
@Slf4j
@Profile("!reservation")
public class StubReservationClient implements ReservationClient{

    // 임시 고정 당일 입장 금액
    private static final Long DEFAULT_ADMISSION_FEE = 20_000L;

    @Override
    public AdmissionContext getAdmissionContext(Long customerId, Long expoId) {
        log.info("[STUB] Reservation 연동 미구현 - 임시 응답 반환 customerId={}, expoId={}", customerId, expoId);
        return new AdmissionContext(expoId, customerId, false, DEFAULT_ADMISSION_FEE);
    }

    @Override
    public void confirmAdmissionPayment(Long customerId, Long expoId, String paymentId, LocalDateTime paidAt) {
        log.info("[STUB] 당일 입장권 발급 통보 (실제로는 아무 일도 안 일어남) customerId={}, expoId={}, paymentId={}",
                customerId, expoId, paymentId);
    }
}