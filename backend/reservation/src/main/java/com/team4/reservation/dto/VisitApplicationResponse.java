package com.team4.reservation.dto;

import java.util.List;
import lombok.Getter;

// 방문 예약 신청 결과. 신청한 날짜 수만큼 tickets에 담겨 반환됨(멱등 — 이미 받은 날짜는 기존 티켓 그대로 포함).
@Getter
public class VisitApplicationResponse {

    private final Long expoId;
    private final List<TicketResponse> tickets;

    public VisitApplicationResponse(Long expoId, List<TicketResponse> tickets) {
        this.expoId = expoId;
        this.tickets = tickets;
    }
}
