package com.team4.payment.controller;

import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.service.AdmissionPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/admission-payments")
@RequiredArgsConstructor
public class AdmissionPaymentController {

    private final AdmissionPaymentService admissionPaymentService;

    @PostMapping
    public AdmissionPayment pay(@RequestBody AdmissionPaymentRequest request){
        return admissionPaymentService.pay(
                request.customerId(),
                request.expoId(),
                request.amount(),
                request.payMethod(),
                request.paymentId()
        );
    }

    public record AdmissionPaymentRequest(
            Long customerId,
            Long expoId,
            Long amount,
            String payMethod,
            String paymentId
    ) {}
}
