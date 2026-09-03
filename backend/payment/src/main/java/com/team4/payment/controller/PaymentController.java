package com.team4.payment.controller;

import com.team4.payment.entity.Payment;
import com.team4.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exhibitor/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping
    public Payment pay(@RequestBody PaymentRequest request) {
        return paymentService.pay(
                request.bookingId(),
                request.userId(),
                request.amount(),
                request.payMethod()
        );

    }

    public record PaymentRequest(Long bookingId, Long userId, Long amount, String payMethod) {}
}
