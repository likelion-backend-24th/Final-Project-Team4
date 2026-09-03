package com.team4.expo.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.dto.BoothApplicationGroupDetailResponse;
import com.team4.expo.dto.ExpoAdminSummaryResponse;
import com.team4.expo.dto.ExpoBoothsResponse;
import com.team4.expo.dto.ExpoRegisterRequest;
import com.team4.expo.dto.ExpoResponse;
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

    public ExpoAdminController(ExpoService expoService) {
        this.expoService = expoService;
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
    public ResponseEntity<ApiResponse<PageMeta<ExpoAdminSummaryResponse>>> listExposForAdmin(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PageableDefault(size = 20) Pageable pageable) {

        requireAdmin(role);

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listExposForAdmin(pageable))));
    }

    // Admin - 특정 박람회의 실시간 부스 배치 현황
    @GetMapping("/api/admin/expos/{expoId}/booths")
    public ResponseEntity<ApiResponse<ExpoBoothsResponse>> getExpoBoothsForAdmin(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable Long expoId) {

        requireAdmin(role);

        return ResponseEntity.ok(ApiResponse.success(expoService.getExpoBoothsForAdmin(expoId)));
    }

    // Admin - 전체 부스 참가 신청 목록 조회 (그룹 단위)
    @GetMapping("/api/admin/booth-applications")
    public ResponseEntity<ApiResponse<PageMeta<BoothApplicationGroupDetailResponse>>> listBoothApplications(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PageableDefault(size = 10) Pageable pageable) {

        requireAdmin(role);

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listBoothApplications(pageable))));
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equals(role)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
    }
}