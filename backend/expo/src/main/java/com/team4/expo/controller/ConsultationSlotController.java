package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.ConsultationSlotAvailabilityResponse;
import com.team4.expo.dto.ConsultationSlotSettingsRequest;
import com.team4.expo.dto.ConsultationSlotSettingsResponse;
import com.team4.expo.security.GatewayUser;
import com.team4.expo.service.ConsultationSlotService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 상담 접수 정원 - 참가업체(EXHIBITOR)가 지정하고, 고객(USER)이 신청 화면에서 잔여를 확인한다(SecurityConfig 역할 매칭).
@RestController
public class ConsultationSlotController {

    private final ConsultationSlotService consultationSlotService;

    public ConsultationSlotController(ConsultationSlotService consultationSlotService) {
        this.consultationSlotService = consultationSlotService;
    }

    @GetMapping("/api/exhibitor/booths/{boothId}/consultation-slots")
    public ResponseEntity<ApiResponse<ConsultationSlotSettingsResponse>> getSettings(
            @AuthenticationPrincipal GatewayUser exhibitor, @PathVariable Long boothId) {
        return ResponseEntity.ok(ApiResponse.success(consultationSlotService.getSettings(exhibitor.getId(), boothId)));
    }

    @PutMapping("/api/exhibitor/booths/{boothId}/consultation-slots")
    public ResponseEntity<ApiResponse<ConsultationSlotSettingsResponse>> saveSettings(
            @AuthenticationPrincipal GatewayUser exhibitor, @PathVariable Long boothId,
            @Valid @RequestBody ConsultationSlotSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(consultationSlotService.saveSettings(exhibitor.getId(), boothId, request)));
    }

    @GetMapping("/api/customer/consultations/booths/{boothId}/slots")
    public ResponseEntity<ApiResponse<ConsultationSlotAvailabilityResponse>> getAvailability(
            @PathVariable Long boothId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(consultationSlotService.getAvailability(boothId, date)));
    }
}
