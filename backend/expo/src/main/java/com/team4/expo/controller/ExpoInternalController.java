package com.team4.expo.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.BoothApplicationGroupConfirmRequest;
import com.team4.expo.dto.BoothApplicationGroupConfirmResponse;
import com.team4.expo.dto.BoothApplicationGroupPaymentContextResponse;
import com.team4.expo.dto.BoothApplicationGroupReleaseRequest;
import com.team4.expo.dto.BoothApplicationGroupReleaseResponse;
import com.team4.expo.service.BoothApplicationPaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// 서비스 간 내부 API. Gateway·OpenAPI에 노출하지 않음 - 호출자별 SVC_TOKEN Bearer로만 검증(사용자 토큰/Role 미사용).
@RestController
@RequestMapping("/internal/expo/booth-application-groups")
public class ExpoInternalController {

    private final BoothApplicationPaymentService boothApplicationPaymentService;

    @Value("${service.token.payment}")
    private String paymentServiceToken;

    public ExpoInternalController(BoothApplicationPaymentService boothApplicationPaymentService) {
        this.boothApplicationPaymentService = boothApplicationPaymentService;
    }

    // Payment -> Expo. 결제 시작 전 그룹의 심사 완료 여부·결제 대상·금액 확인.
    @GetMapping("/{groupId}/payment-context")
    public ResponseEntity<ApiResponse<BoothApplicationGroupPaymentContextResponse>> getPaymentContext(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String groupId) {

        requirePaymentService(authorization);

        return ResponseEntity.ok(ApiResponse.success(boothApplicationPaymentService.getBoothApplicationGroupPaymentContext(groupId)));
    }

    // Payment -> Expo. 결제 완료 확인 후 그룹 내 승인된 부스들을 확정.
    @PostMapping("/{groupId}/confirm")
    public ResponseEntity<ApiResponse<BoothApplicationGroupConfirmResponse>> confirm(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String groupId,
            @Valid @RequestBody BoothApplicationGroupConfirmRequest request) {

        requirePaymentService(authorization);

        return ResponseEntity.ok(ApiResponse.success(
                boothApplicationPaymentService.confirmBoothApplicationGroup(groupId, request.getPaymentId(), request.getPaidAt())));
    }

    // Payment -> Expo. 결제 실패/시간 초과 시 호출 — 승인됐던 부스 잠금을 풀고 신청을 반려 처리.
    @PostMapping("/{groupId}/release")
    public ResponseEntity<ApiResponse<BoothApplicationGroupReleaseResponse>> release(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String groupId,
            @RequestBody(required = false) BoothApplicationGroupReleaseRequest request) {

        requirePaymentService(authorization);

        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(ApiResponse.success(boothApplicationPaymentService.releaseBoothApplicationGroup(groupId, reason)));
    }

    private void requirePaymentService(String authorization) {
        String expected = "Bearer " + paymentServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}
