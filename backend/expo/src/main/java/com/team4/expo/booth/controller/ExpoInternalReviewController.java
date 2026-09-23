package com.team4.expo.booth.controller;


import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.expo.booth.dto.BoothOwnershipResponse;
import com.team4.expo.booth.dto.BoothReviewEligibilityResponse;
import com.team4.expo.consultation.service.ConsultationService;
import com.team4.expo.lead.service.LeadService;
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
    private final LeadService leadService;

    @Value("${service.token.review}")
    private String reviewServiceToken;

    public ExpoInternalReviewController(ConsultationService consultationService, LeadService leadService) {
        this.consultationService = consultationService;
        this.leadService = leadService;
    }

    // Review -> Expo. 후기 작성 전 자격 확인 + 표시용 boothNo 조회.
    // reviewType=CONSULT: 상담 COMPLETED+5일 / BOOTH: 방문 기록(Lead)+방문 후 5일(TASK 7-2).
    @GetMapping("/{boothId}/review-eligibility")
    public ResponseEntity<ApiResponse<BoothReviewEligibilityResponse>> getReviewEligibility(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long boothId,
            @RequestParam Long customerId,
            @RequestParam String reviewType,
            @RequestParam(required = false) Long consultationId) {

        requireReviewService(authorization);

        return ResponseEntity.ok(ApiResponse.success(
                consultationService.getBoothReviewEligibility(boothId, customerId, reviewType, consultationId)));
    }

    // Review -> Expo. 참가업체가 본인 부스 후기를 조회하기 전에 그 부스 소유(참가 확정) 여부 확인.
    @GetMapping("/{boothId}/owned-by")
    public ResponseEntity<ApiResponse<BoothOwnershipResponse>> getBoothOwnership(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long boothId,
            @RequestParam Long exhibitorId) {

        requireReviewService(authorization);

        return ResponseEntity.ok(ApiResponse.success(
                new BoothOwnershipResponse(leadService.isOwnedByExhibitor(exhibitorId, boothId))));
    }

    private void requireReviewService(String authorization) {
        String expected = "Bearer " + reviewServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}
