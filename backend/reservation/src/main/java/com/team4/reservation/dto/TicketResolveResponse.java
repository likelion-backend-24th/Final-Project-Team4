package com.team4.reservation.dto;

import com.team4.reservation.domain.Ticket;
import java.time.LocalDate;
import lombok.Getter;

// Expo -> Reservation 내부 API 응답. QR 스캔으로 참가업체 리드를 생성할 때 고객을 식별하는 용도(읽기 전용, 상태 불변).
@Getter
public class TicketResolveResponse {

    private final Long customerId;
    private final Long ticketId;
    private final Long expoId;
    private final LocalDate visitDate;

    private TicketResolveResponse(Long customerId, Long ticketId, Long expoId, LocalDate visitDate) {
        this.customerId = customerId;
        this.ticketId = ticketId;
        this.expoId = expoId;
        this.visitDate = visitDate;
    }

    public static TicketResolveResponse from(Ticket ticket) {
        return new TicketResolveResponse(ticket.getCustomerId(), ticket.getId(), ticket.getExpoId(), ticket.getVisitDate());
    }
}
