package com.team4.reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class HourlyCheckInResponse {
    private final int hour; // 시간대별
    private final long count; // 체크인 수
    private final long free; // 무료 입장권 체크인 수
    private final long paid; // 유료 입장권 체크인 수
}
