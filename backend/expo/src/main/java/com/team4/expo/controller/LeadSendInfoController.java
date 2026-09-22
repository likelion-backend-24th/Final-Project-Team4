package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.LeadResponse;
import com.team4.expo.dto.LeadSendInfoRequest;
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

// 참가업체가 확정한 이메일 초안을 고객에게 최종 발송 (TASK 11-4).
@RestController
@RequestMapping("/api/exhibitor/leads/{leadId}/send-info")
public class LeadSendInfoController {

    private final LeadService leadService;

    public LeadSendInfoController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LeadResponse>> sendInfo(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long leadId,
            @Valid @RequestBody LeadSendInfoRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                leadService.sendInfo(exhibitor.getId(), leadId, request.getEmailBody())));
    }
}
