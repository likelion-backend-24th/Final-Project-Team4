package com.team4.payment.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.payment.dto.PaymentListItemResponse;
import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exhibitor/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping
    public Payment pay(@RequestBody PaymentRequest request, @RequestHeader("X-User-Id") Long userId) {
        return paymentService.pay(
                request.bookingId(),
                userId,
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

    // 로그인한 사용자(참가업체)의 결제 내역 전체 조회 - 마이페이지 "참가비 결제 내역" 표에서 사용
    @GetMapping
    public List<PaymentListItemResponse> getMyPayments(@RequestHeader("X-User-Id") Long userId) {
        return paymentService.findByUserId(userId).stream()
                .map(PaymentListItemResponse::from)
                .toList();
    }

    public record PaymentRequest(String bookingId, Long amount, String payMethod, String paymentId) {}
    public record PaymentStatusResponse(String bookingId, PaymentStatus status) {}
}