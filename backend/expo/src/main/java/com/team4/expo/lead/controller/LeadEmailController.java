package com.team4.expo.lead.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.lead.dto.LeadEmailUpdateRequest;
import com.team4.expo.lead.dto.LeadResponse;
import com.team4.common.security.GatewayUser;
import com.team4.expo.lead.service.LeadService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 참가업체가 리드의 고객 이메일을 직접 입력/수정 - 워크인(이메일이 아예 없을 수 있음)뿐 아니라
// 상담 신청 건도 대상(오탈자·변경된 주소 정정용, 2026-09-18 확정).
@RestController
@RequestMapping("/api/exhibitor/leads/{leadId}/email")
public class LeadEmailController {

    private final LeadService leadService;

    public LeadEmailController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PutMapping
    public ResponseEntity<ApiResponse<LeadResponse>> updateCustomerEmail(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long leadId,
            @Valid @RequestBody LeadEmailUpdateRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                leadService.updateCustomerEmail(exhibitor.getId(), leadId, request.getCustomerEmail())));
    }
}
