package com.team4.payment.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
                request.payMethod(),
                request.paymentId()
        );
    }

    @GetMapping("/{bookingId}/status")
    public PaymentStatusResponse getStatus(@PathVariable String bookingId){
        Payment payment = paymentService.findByBookingId(bookingId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND,
                        "결제 내역이 없습니다. bookingId=" + bookingId));

        return new PaymentStatusResponse(payment.getBookingId(), payment.getStatus());
    }

    public record PaymentRequest(String bookingId, Long userId, Long amount, String payMethod, String paymentId) {}
    public record PaymentStatusResponse(String bookingId, PaymentStatus status) {}
}