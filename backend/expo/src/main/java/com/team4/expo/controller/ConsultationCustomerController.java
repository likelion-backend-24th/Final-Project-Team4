package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.ConsultationRequest;
import com.team4.expo.dto.ConsultationResponse;
import com.team4.expo.security.GatewayUser;
import com.team4.expo.service.ConsultationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
}
