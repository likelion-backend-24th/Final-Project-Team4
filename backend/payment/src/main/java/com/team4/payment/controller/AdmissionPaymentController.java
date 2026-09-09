package com.team4.payment.controller;

import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.service.AdmissionPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/admission-payments")
@RequiredArgsConstructor
public class AdmissionPaymentController {

    private final AdmissionPaymentService admissionPaymentService;

    // 결제 대상 고객은 클라이언트가 body로 보낸 값이 아니라 Gateway가 JWT에서 꺼내 주입한
    // X-User-Id 헤더로만 정한다 — body의 customerId를 믿으면 로그인한 사용자가 남의 id로
    // 결제/티켓 발급을 시킬 수 있음.
    @PostMapping
    public AdmissionPayment pay(@RequestHeader("X-User-Id") Long customerId,
                                 @RequestBody AdmissionPaymentRequest request) {
        return admissionPaymentService.pay(
                customerId,
                request.expoId(),
                request.amount(),
                request.payMethod(),
                request.paymentId()
        );
    }

    public record AdmissionPaymentRequest(
            Long expoId,
            Long amount,
            String payMethod,
            String paymentId
    ) {}
}
