package com.team4.expo.client;

import java.time.LocalDate;

// Reservation의 /internal/reservation/expos/{expoId}/tickets/apply-schedule-change 응답 한 건. => ScheduleChangeAffectedTicket 필드 동일
// cancelled=true면 새 개최 기간 밖으로 벗어나 QR이 취소됐다는 뜻, false면 QR은 그대로 유효.
public record ScheduleChangeTicket(Long customerId, LocalDate visitDate, boolean cancelled) {
}
