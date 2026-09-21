package com.team4.reservation.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DailyCheckInResponse {
    private final LocalDate date; // 일별
    private final long count; // 체크인 수
}
