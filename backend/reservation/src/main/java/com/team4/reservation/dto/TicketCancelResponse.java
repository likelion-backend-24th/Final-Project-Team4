package com.team4.reservation.dto;

// Payment -> Reservation 환불 처리 중 티켓 무효화 요청의 응답.
// cancelled=false면 이미 체크인(USED)된 티켓이라는 뜻 — 호출부(Payment)가 환불을 막는다.
public record TicketCancelResponse(boolean cancelled) {
}
