package com.team4.expo.client;

import java.time.LocalDate;

// Reservation의 /internal/reservation/tickets/resolve 응답
public record TicketResolveResult(Long customerId, Long ticketId, Long expoId, LocalDate visitDate) {
}
