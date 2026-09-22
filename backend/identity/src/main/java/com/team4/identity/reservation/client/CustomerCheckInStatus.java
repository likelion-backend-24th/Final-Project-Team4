package com.team4.identity.reservation.client;

import java.time.LocalDateTime;

// Reservation의 /internal/reservation/customers/check-in-status 응답 1건 - 관리자 회원(참관객) 목록 enrich용.
public record CustomerCheckInStatus(Long customerId, boolean checkedIn, LocalDateTime lastCheckedInAt) {
}