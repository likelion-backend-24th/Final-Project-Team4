package com.team4.expo.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.dto.BoothApplicationDraftUpdateRequest;
import com.team4.expo.dto.BoothApplicationGroupCancelResponse;
import com.team4.expo.dto.BoothApplicationGroupDetailResponse;
import com.team4.expo.dto.BoothApplicationGroupResponse;
import com.team4.expo.dto.BoothApplicationRequest;
import com.team4.expo.dto.ExpoBoothsResponse;
import com.team4.expo.dto.ExpoSummaryResponse;
import com.team4.expo.service.BoothApplicationService;
import com.team4.expo.service.ExpoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// 참가업체(exhibitor) 전용 API. 신원은 X-User-Id 헤더로 받는다.
@RestController
@RequestMapping("/api/exhibitor")
public class ExpoExhibitorController {

    private final ExpoService expoService;
    private final BoothApplicationService boothApplicationService;

    public ExpoExhibitorController(ExpoService expoService, BoothApplicationService boothApplicationService) {
        this.expoService = expoService;
        this.boothApplicationService = boothApplicationService;
    }

    /*
     * TODO: 신원 처리 @RequestHeader + requireExhibitor()에서 이후 Gateway 구현할 때 SecurityContext 기반으로 전환 예정!!!
     *  + 문서 수정
     */
  
    // 부스 참가 신청 접수(다중 선택) / 임시저장
    @PostMapping("/booth-applications")
    public ResponseEntity<ApiResponse<BoothApplicationGroupResponse>> applyBooth(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody BoothApplicationRequest request) {

        requireExhibitor(role);

        BoothApplicationGroupResponse response = boothApplicationService.applyBooth(exhibitorId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    // 임시저장 그룹 수정
    @PatchMapping("/booth-applications/groups/{groupId}")
    public ResponseEntity<ApiResponse<BoothApplicationGroupResponse>> updateBoothApplicationDraft(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable String groupId,
            @Valid @RequestBody BoothApplicationDraftUpdateRequest request) {

        requireExhibitor(role);

        BoothApplicationGroupResponse response = boothApplicationService.updateBoothApplicationDraft(exhibitorId, groupId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 임시저장 그룹 최종 제출 (DRAFT -> SUBMITTED)
    @PostMapping("/booth-applications/groups/{groupId}/submit")
    public ResponseEntity<ApiResponse<BoothApplicationGroupResponse>> submitBoothApplicationDraft(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable String groupId) {

        requireExhibitor(role);

        BoothApplicationGroupResponse response = boothApplicationService.submitBoothApplicationDraft(exhibitorId, groupId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 신청 그룹 취소
    @DeleteMapping("/booth-applications/groups/{groupId}")
    public ResponseEntity<ApiResponse<BoothApplicationGroupCancelResponse>> deleteBoothApplicationGroup(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable String groupId) {

        requireExhibitor(role);

        BoothApplicationGroupCancelResponse response = boothApplicationService.deleteBoothApplicationGroup(exhibitorId, groupId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 마이페이지 - 내 부스 신청 내역 조회 (그룹 단위)
    @GetMapping("/booth-applications")
    public ResponseEntity<ApiResponse<PageMeta<BoothApplicationGroupDetailResponse>>> listMyBoothApplications(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PageableDefault(size = 10) Pageable pageable) {

        requireExhibitor(role);

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(boothApplicationService.listMyBoothApplications(exhibitorId, pageable))));
    }

    // open 박람회 목록 페이징 조회
    @GetMapping("/expos")
    public ResponseEntity<ApiResponse<PageMeta<ExpoSummaryResponse>>> listOpenExpos(@RequestHeader(value = "X-User-Role", required = false) String role,
                                                                                    @PageableDefault(size = 10, sort = "applyEndsAt") Pageable pageable) {
        requireExhibitor(role);

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listOpenExpos(pageable))));
    }

    // 특정 박람회의 부스 목록 조회
    @GetMapping("/expos/{expoId}/booths")
    public ResponseEntity<ApiResponse<ExpoBoothsResponse>> getExpoBooths(@RequestHeader(value = "X-User-Role", required = false) String role,
                                                                         @PathVariable Long expoId,
                                                                         @RequestParam(required = false) String status) {
        requireExhibitor(role);

        BoothStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try {
                statusFilter = BoothStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new CustomException(ErrorCode.VALIDATION_ERROR, "status 값이 올바르지 않습니다.");
            }
        }

        return ResponseEntity.ok(ApiResponse.success(expoService.getExpoBooths(expoId, statusFilter)));
    }

    private void requireExhibitor(String role) {
        if (!"EXHIBITOR".equals(role)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "참가업체만 접근할 수 있습니다.");
        }
    }

    // 신청 그룹 단건 상세 조회 (결제 화면에서 사용)
    @GetMapping("/booth-applications/groups/{groupId}")
    public ResponseEntity<ApiResponse<BoothApplicationGroupDetailResponse>> getBoothApplicationGroupDetail(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable String groupId) {

        requireExhibitor(role);

        BoothApplicationGroupDetailResponse response = expoService.getBoothApplicationGroupDetail(exhibitorId, groupId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
