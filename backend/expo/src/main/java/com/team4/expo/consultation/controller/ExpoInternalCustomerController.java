package com.team4.expo.consultation.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.expo.consultation.service.ConsultationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 서비스 간 내부 API. Gateway, OpenAPI에 노출하지 않음 - SVC_TOKEN Bearer로만 검증
@RestController
@RequestMapping("/internal/expo/customers")
public class ExpoInternalCustomerController {

    private final ConsultationService consultationService;

    @Value("${service.token.identity}")
    private String identityServiceToken;

    public ExpoInternalCustomerController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    // Identity -> Expo. 회원 탈퇴 시 상담 신청, 리드의 개인정보 익명화
    @PostMapping("/{customerId}/anonymize")
    public ResponseEntity<ApiResponse<Void>> anonymize(@RequestHeader("Authorization") String authorization,
                                                       @PathVariable Long customerId) {

        if (authorization == null || !authorization.equals("Bearer " + identityServiceToken)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }

        consultationService.anonymizeCustomer(customerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
