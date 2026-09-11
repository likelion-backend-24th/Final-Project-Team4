package com.team4.payment.client;

import java.time.LocalDate;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Primary
@Slf4j
@Profile("!reservation")
public class StubReservationClient implements ReservationClient{

    // 임시 고정 당일 입장 금액
    private static final Long DEFAULT_ADMISSION_FEE = 20_000L;

    @Override
    public AdmissionContext getAdmissionContext(Long customerId, Long expoId, List<LocalDate> visitDates) {
        log.info("[STUB] Reservation 연동 미구현 - 임시 응답 반환 customerId={}, expoId={}", customerId, expoId);
        return new AdmissionContext(expoId, customerId, List.of(), DEFAULT_ADMISSION_FEE);
    }

    @Override
    public List<AdmissionTicket> issueAdmissionTicket(Long customerId, Long expoId, List<LocalDate> visitDates) {
        log.info("[STUB] Reservation 티켓 발급 연동 미구현 - 임시 응답 반환 customerId={}, expoId={}", customerId, expoId);
        return visitDates.stream()
                .map(visitDate -> new AdmissionTicket(-1L, visitDate, "stub-qr-token", null))
                .toList();
    }
}
