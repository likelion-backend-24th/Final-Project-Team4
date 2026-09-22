package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.LeadResponse;
import com.team4.expo.dto.LeadSummaryRequest;
import com.team4.common.security.GatewayUser;
import com.team4.expo.service.LeadService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 참가업체가 리드에 현장 상담 메모를 입력하면 Gemini가 고객용 이메일 초안으로 정리 (TASK 11-3, 발송 전 미리보기).
@RestController
@RequestMapping("/api/exhibitor/leads/{leadId}/summary")
public class LeadSummaryController {

    private final LeadService leadService;

    public LeadSummaryController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LeadResponse>> generateEmailSummary(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long leadId,
            @Valid @RequestBody LeadSummaryRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                leadService.generateEmailSummary(exhibitor.getId(), leadId, request.getConsultationNote())));
    }
}
