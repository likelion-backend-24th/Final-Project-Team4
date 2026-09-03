package com.team4.expo.dto;

import com.team4.expo.domain.ExpoStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

// Admin 박람회 목록 - 박람회별 부스·신청 현황 집계
@Getter
@AllArgsConstructor
public class ExpoAdminSummaryResponse {
    private final Long expoId;
    private final String title;
    private final ExpoStatus status;
    private final LocalDateTime applyStartsAt;
    private final LocalDateTime applyEndsAt;
    private final int totalBooths;
    private final int availableBooths;
    private final int totalApplications;
    private final int pendingCount;   // SUBMITTED (심사 대기)
    private final int approvedCount;  // PAYMENT_PENDING + CONFIRMED
    private final int rejectedCount;  // REJECTED
}
