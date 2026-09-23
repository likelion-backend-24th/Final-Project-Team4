package com.team4.expo.consultation.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.consultation.dto.ConsultationRequest;
import com.team4.expo.consultation.dto.ConsultationResponse;
import com.team4.expo.consultation.dto.ConsultationReviewContextResponse;
import com.team4.expo.consultation.dto.ConsultationReviewDraftRequest;
import com.team4.expo.consultation.dto.ConsultationReviewDraftResponse;
import com.team4.expo.consultation.dto.ReviewPolishRequest;
import com.team4.expo.consultation.dto.ConsultationUpdateRequest;
import com.team4.common.security.GatewayUser;
import com.team4.expo.consultation.service.ConsultationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 고객(customer)의 차량 구매/시승 상담 신청. 신원은 SecurityContext(GatewayUser)에서 받는다. USER 역할만 허용(SecurityConfig).
@RestController
@RequestMapping("/api/customer/consultations")
public class ConsultationCustomerController {

    private final ConsultationService consultationService;

    public ConsultationCustomerController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<List<ConsultationResponse>>> applyConsultation(
            @AuthenticationPrincipal GatewayUser customer,
            @Valid @RequestBody ConsultationRequest request) {

        List<ConsultationResponse> response = consultationService.applyConsultation(customer.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConsultationResponse>>> listMyConsultations(
            @AuthenticationPrincipal GatewayUser customer) {

        return ResponseEntity.ok(ApiResponse.success(consultationService.listMyConsultations(customer.getId())));
    }

    // 대기 중(REQUESTED)인 본인 상담 신청 수정.
    @PutMapping("/{consultationId}")
    public ResponseEntity<ApiResponse<ConsultationResponse>> updateConsultation(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long consultationId,
            @Valid @RequestBody ConsultationUpdateRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationService.updateConsultation(customer.getId(), consultationId, request)));
    }

    // 대기 중(REQUESTED)인 본인 상담 신청 취소.
    @PostMapping("/{consultationId}/cancel")
    public ResponseEntity<ApiResponse<ConsultationResponse>> cancelConsultation(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long consultationId) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationService.cancelConsultation(customer.getId(), consultationId)));
    }

    // 후기 작성 화면 - 본인 요구사항 + 참가업체 상담 메모("상담내용" 패널용).
    @GetMapping("/{consultationId}/review-context")
    public ResponseEntity<ApiResponse<ConsultationReviewContextResponse>> getReviewContext(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long consultationId) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationService.getReviewContext(customer.getId(), consultationId)));
    }

    // 후기 작성 화면 - AI 후기 초안 생성.
    @PostMapping("/{consultationId}/review-draft")
    public ResponseEntity<ApiResponse<ConsultationReviewDraftResponse>> draftReview(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long consultationId,
            @Valid @RequestBody ConsultationReviewDraftRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationService.draftReview(customer.getId(), consultationId, request.getReviewType(), request.getVehicleName())));
    }

    // 후기 작성 화면 - 고객이 쓴 후기 문장을 AI로 다듬기(상담 건과 무관).
    @PostMapping("/review-polish")
    public ResponseEntity<ApiResponse<ConsultationReviewDraftResponse>> polishReview(
            @Valid @RequestBody ReviewPolishRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                consultationService.polishReview(request.getReviewType(), request.getVehicleName(), request.getContent())));
    }
}
