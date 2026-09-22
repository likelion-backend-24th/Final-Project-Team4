package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.LeadResponse;
import com.team4.expo.dto.LeadScanRequest;
import com.team4.common.security.GatewayUser;
import com.team4.expo.service.LeadService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 참가업체가 본인 부스에서 고객 QR을 스캔해 리드(연락처)를 확보·조회. 신원은 SecurityContext(GatewayUser)에서 받음.
@RestController
@RequestMapping("/api/exhibitor/booths/{boothId}/leads")
public class LeadController {

    private final LeadService leadService;

    public LeadController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LeadResponse>> scanLead(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @Valid @RequestBody LeadScanRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                leadService.scanLead(exhibitor.getId(), boothId, request.getQrToken())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LeadResponse>>> listLeads(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId) {

        return ResponseEntity.ok(ApiResponse.success(leadService.listForBooth(exhibitor.getId(), boothId)));
    }
}
