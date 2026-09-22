package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.BoothStatsResponse;
import com.team4.common.security.GatewayUser;
import com.team4.expo.service.ConsultationReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 참가업체 대시보드 - 본인 부스의 상담 상태별 건수 + 방문자(Lead) 수(카운트만, 2026-09-16 확정).
@RestController
@RequestMapping("/api/exhibitor/booths/{boothId}/stats")
public class BoothStatsController {

    private final ConsultationReviewService consultationReviewService;

    public BoothStatsController(ConsultationReviewService consultationReviewService) {
        this.consultationReviewService = consultationReviewService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<BoothStatsResponse>> getBoothStats(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationReviewService.getBoothStats(exhibitor.getId(), boothId)));
    }
}
