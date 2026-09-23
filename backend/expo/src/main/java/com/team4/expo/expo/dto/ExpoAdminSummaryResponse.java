package com.team4.expo.expo.dto;

import com.team4.expo.expo.domain.ExpoStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

// Admin 박람회 목록: 박람회별 부스·신청 현황 집계
@Getter
@AllArgsConstructor
public class ExpoAdminSummaryResponse {
    private final Long expoId;
    private final String title;
    private final String bannerImageUrl;
    private final ExpoStatus status;
    private final LocalDateTime applyStartsAt;
    private final LocalDateTime applyEndsAt;
    private final LocalDateTime startsAt;   // 박람회 자체 시작일 - 프론트에서 진행 단계(phaseOf) 계산에 사용
    private final LocalDateTime endsAt;     // 박람회 자체 종료일 - 프론트에서 진행 단계(phaseOf) 계산에 사용
    private final int totalBooths;
    private final int availableBooths;
    private final int totalApplications;
    private final int pendingCount;   // SUBMITTED (심사 대기)
    private final int approvedCount;  // PAYMENT_PENDING + CONFIRMED
    private final int rejectedCount;  // REJECTED
    private final int paymentPendingCount; // PAYMENT_PENDING (승인됐고 결제 대기 중)
}
