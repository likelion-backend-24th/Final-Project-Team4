package com.team4.reservation.controller;

import com.team4.common.response.ApiResponse;
import com.team4.reservation.dto.CheckInRequest;
import com.team4.reservation.dto.CheckInResponse;
import com.team4.reservation.service.CheckInService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReservationAdminController {

    private final CheckInService checkInService;

    public ReservationAdminController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    // 현장 QR 스캔 체크인. 단일 사용 보장 — 이미 사용된 QR은 409.
    @PostMapping("/api/admin/reservation/check-ins")
    public ResponseEntity<ApiResponse<CheckInResponse>> checkIn(@Valid @RequestBody CheckInRequest request) {
        return ResponseEntity.ok(ApiResponse.success(checkInService.checkIn(request.getQrToken(), request.getExpoId())));
    }
}
