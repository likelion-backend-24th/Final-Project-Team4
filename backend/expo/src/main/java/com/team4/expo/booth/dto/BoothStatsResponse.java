package com.team4.expo.booth.dto;

// 참가업체 대시보드 - 부스 단위 상담/방문 건수 통계(카운트만, 2026-09-16 확정).
public record BoothStatsResponse(
        Long boothId,
        String boothNo,
        long requestedCount,
        long approvedCount,
        long rejectedCount,
        long completedCount,
        long noShowCount,
        long canceledCount,
        long visitCount
) {
}
