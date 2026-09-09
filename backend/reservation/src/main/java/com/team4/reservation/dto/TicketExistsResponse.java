package com.team4.reservation.dto;

import lombok.Getter;

// Expo -> Reservation 내부 API 응답. 상담 신청 시점에 그 날짜 입장권 보유 여부만 알려줌.
@Getter
public class TicketExistsResponse {

    private final boolean hasTicket;

    public TicketExistsResponse(boolean hasTicket) {
        this.hasTicket = hasTicket;
    }
}
