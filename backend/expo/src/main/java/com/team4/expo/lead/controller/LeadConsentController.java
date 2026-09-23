package com.team4.expo.lead.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.lead.dto.LeadResponse;
import com.team4.common.security.GatewayUser;
import com.team4.expo.lead.service.LeadService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 워크인 리드는 스캔 시점엔 동의 없이 생성됨 - 참가업체가 현장에서 고객에게 구두로 연락처 제공 동의를
// 확인한 뒤 이 API로 확정(QR 리드 확보 화면의 스캔 결과 카드, 2026-09-18 확정).
@RestController
@RequestMapping("/api/exhibitor/leads/{leadId}/consent")
public class LeadConsentController {

    private final LeadService leadService;

    public LeadConsentController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LeadResponse>> confirmLeadConsent(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long leadId) {

        return ResponseEntity.ok(ApiResponse.success(leadService.confirmLeadConsent(exhibitor.getId(), leadId)));
    }
}
