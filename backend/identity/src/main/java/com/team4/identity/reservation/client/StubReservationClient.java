package com.team4.identity.reservation.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

// "reservation" 프로필이 아닐 때(로컬 개발/테스트 기본값) 쓰는 대체 구현 - 실제 HTTP 호출 없이 항상 성공 처리.
// payment 모듈의 StubReservationClient와 같은 컨벤션.
@Component
@Profile("!reservation")
@Slf4j
public class StubReservationClient implements ReservationClient {

    @Override
    public void invalidateAllTickets(Long customerId) {
        log.info("[STUB] Reservation 티켓 무효화 연동 미구현 - 항상 성공으로 처리 customerId={}", customerId);
    }
}
