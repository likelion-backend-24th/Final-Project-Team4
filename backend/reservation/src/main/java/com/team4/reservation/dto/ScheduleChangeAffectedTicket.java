package com.team4.reservation.dto;

import java.time.LocalDate;

// 박람회 일정 변경(Expo -> Reservation) 결과 한 건. cancelled=true면 새 개최 기간 밖으로 벗어나 QR을 취소했다는 뜻.
public record ScheduleChangeAffectedTicket(Long customerId, LocalDate visitDate, boolean cancelled) {
}
