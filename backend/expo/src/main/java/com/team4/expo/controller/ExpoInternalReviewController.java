package com.team4.expo.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.BoothReviewEligibilityResponse;
import com.team4.expo.service.ConsultationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 서비스 간 내부 API. Gateway·OpenAPI에 노출하지 않음 - 호출자별 SVC_TOKEN Bearer로만 검증(사용자 토큰/Role 미사용).
@RestController
@RequestMapping("/internal/expo/booths")
public class ExpoInternalReviewController {

    private final ConsultationService consultationService;

    @Value("${service.token.review}")
    private String reviewServiceToken;

    public ExpoInternalReviewController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    // Review -> Expo. 후기 작성 전 자격 확인 + 표시용 boothNo 조회.
    // reviewType=CONSULT: 상담 COMPLETED+5일 / BOOTH: 방문 기록(Lead)+방문 후 5일(TASK 7-2).
    @GetMapping("/{boothId}/review-eligibility")
    public ResponseEntity<ApiResponse<BoothReviewEligibilityResponse>> getReviewEligibility(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long boothId,
            @RequestParam Long customerId,
            @RequestParam String reviewType) {

        requireReviewService(authorization);

        return ResponseEntity.ok(ApiResponse.success(
                consultationService.getBoothReviewEligibility(boothId, customerId, reviewType)));
    }

    private void requireReviewService(String authorization) {
        String expected = "Bearer " + reviewServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}
