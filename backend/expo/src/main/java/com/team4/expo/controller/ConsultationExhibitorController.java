package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.ConsultationRejectRequest;
import com.team4.expo.dto.ConsultationResponse;
import com.team4.expo.security.GatewayUser;
import com.team4.expo.service.ConsultationReviewService;
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

// 참가업체(exhibitor)의 본인 부스로 들어온 차량 상담 신청 조회·승인·반려. 신원은 SecurityContext(GatewayUser)에서 받는다.
@RestController
@RequestMapping("/api/exhibitor/consultations")
public class ConsultationExhibitorController {

    private final ConsultationReviewService consultationReviewService;

    public ConsultationExhibitorController(ConsultationReviewService consultationReviewService) {
        this.consultationReviewService = consultationReviewService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConsultationResponse>>> listConsultations(
            @AuthenticationPrincipal GatewayUser exhibitor) {

        return ResponseEntity.ok(ApiResponse.success(consultationReviewService.listForExhibitor(exhibitor.getId())));
    }

    @PostMapping("/{consultationId}/approve")
    public ResponseEntity<ApiResponse<ConsultationResponse>> approveConsultation(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long consultationId) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationReviewService.approveConsultation(exhibitor.getId(), consultationId)));
    }

    @PostMapping("/{consultationId}/reject")
    public ResponseEntity<ApiResponse<ConsultationResponse>> rejectConsultation(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long consultationId,
            @Valid @RequestBody ConsultationRejectRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationReviewService.rejectConsultation(exhibitor.getId(), consultationId, request.getReason())));
    }
}
