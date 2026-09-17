package com.team4.reservation.dto;

import java.util.List;

// 박람회 일정 변경 시 QR을 발급받은 고객 전체 - 새 기간 밖으로 벗어나 취소된 사람과, 그대로 유효한 사람 모두 포함.
public record ScheduleChangeResponse(List<ScheduleChangeAffectedTicket> tickets) {
}
