package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.dto.BoothApplicationDecisionResponse;
import com.team4.expo.dto.BoothApplicationGroupDetailResponse;
import com.team4.expo.dto.BoothApplicationRejectRequest;
import com.team4.expo.dto.ExpoAdminSummaryResponse;
import com.team4.expo.dto.ExpoBoothsResponse;
import com.team4.expo.dto.ExpoRegisterRequest;
import com.team4.expo.dto.ExpoResponse;
import com.team4.expo.service.BoothApplicationReviewService;
import com.team4.expo.service.BoothApplicationService;
import com.team4.expo.service.ExpoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// 관리자 전용 API.
@RestController
public class ExpoAdminController {

    private final ExpoService expoService;
    private final BoothApplicationService boothApplicationService;
    private final BoothApplicationReviewService boothApplicationReviewService;

    public ExpoAdminController(ExpoService expoService, BoothApplicationService boothApplicationService,
                                BoothApplicationReviewService boothApplicationReviewService) {
        this.expoService = expoService;
        this.boothApplicationService = boothApplicationService;
        this.boothApplicationReviewService = boothApplicationReviewService;
    }

    @PostMapping("/api/admin/expos")
    public ResponseEntity<ApiResponse<ExpoResponse>> registerExpo(
            @Valid @RequestBody ExpoRegisterRequest request) {
        ExpoResponse response = expoService.registerExpo(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/api/admin/expos/{expoId}/open")
    public ResponseEntity<ApiResponse<ExpoResponse>> openExpo(@PathVariable Long expoId) {
        ExpoResponse response = expoService.openExpo(expoId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Admin - 전체 박람회 목록 (상태 무관) + 박람회별 신청 현황 집계
    @GetMapping("/api/admin/expos")
    public ResponseEntity<ApiResponse<PageMeta<ExpoAdminSummaryResponse>>> listExposForAdmin(@PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listExposForAdmin(pageable))));
    }

    // Admin - 특정 박람회의 실시간 부스 배치 현황
    @GetMapping("/api/admin/expos/{expoId}/booths")
    public ResponseEntity<ApiResponse<ExpoBoothsResponse>> getExpoBoothsForAdmin(@PathVariable Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(expoService.getExpoBoothsForAdmin(expoId)));
    }

    // Admin - 전체 부스 참가 신청 목록 조회 (그룹 단위)
    @GetMapping("/api/admin/booth-applications")
    public ResponseEntity<ApiResponse<PageMeta<BoothApplicationGroupDetailResponse>>> listBoothApplications(@PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(boothApplicationService.listBoothApplications(pageable))));
    }

    // Admin - 부스 참가 신청 승인
    @PostMapping("/api/admin/booth-applications/{applicationId}/approve")
    public ResponseEntity<ApiResponse<BoothApplicationDecisionResponse>> approveBoothApplication(@PathVariable Long applicationId) {

        return ResponseEntity.ok(ApiResponse.success(boothApplicationReviewService.approveBoothApplication(applicationId)));
    }

    // Admin - 부스 참가 신청 반려
    @PostMapping("/api/admin/booth-applications/{applicationId}/reject")
    public ResponseEntity<ApiResponse<BoothApplicationDecisionResponse>> rejectBoothApplication(
            @PathVariable Long applicationId,
            @Valid @RequestBody BoothApplicationRejectRequest request) {

        return ResponseEntity.ok(ApiResponse.success(boothApplicationReviewService.rejectBoothApplication(applicationId, request.getReason())));
    }
}
