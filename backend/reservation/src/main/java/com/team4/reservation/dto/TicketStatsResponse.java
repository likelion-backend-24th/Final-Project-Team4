package com.team4.reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 박람회 입장권 현황
@Getter
@AllArgsConstructor
public class TicketStatsResponse {
    private final long freeIssued; // 무료 - 취소 제외
    private final long paidIssued; // 유료 - 취소 제외
    private final long used; // 체크인까지 완료된 수
}
