package com.team4.expo.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.ExpoInternalInfoResponse;
import com.team4.expo.service.ExpoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 서비스 간 내부 API. Gateway·OpenAPI에 노출하지 않음 - 호출자별 SVC_TOKEN Bearer로만 검증(사용자 토큰/Role 미사용).
@RestController
@RequestMapping("/internal/expo/expos")
public class ExpoInternalQueryController {

    private final ExpoService expoService;

    @Value("${service.token.reservation}")
    private String reservationServiceToken;

    public ExpoInternalQueryController(ExpoService expoService) {
        this.expoService = expoService;
    }

    // Reservation -> Expo. 방문 예약 신청 시점에 박람회 공개 상태·시작일을 확인해 무료/유료를 가르는 데 씀.
    @GetMapping("/{expoId}")
    public ResponseEntity<ApiResponse<ExpoInternalInfoResponse>> getExpo(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long expoId) {

        requireReservationService(authorization);

        return ResponseEntity.ok(ApiResponse.success(expoService.getExpoInternalInfo(expoId)));
    }

    private void requireReservationService(String authorization) {
        String expected = "Bearer " + reservationServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}
