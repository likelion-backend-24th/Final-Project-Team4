package com.team4.payment.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.payment.client.BookingClient;
import com.team4.payment.client.BookingInfoResponse;
import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final BookingClient bookingClient;
    private final PaymentGateway paymentGateway;

    // 결제 도메인 저장.
    @Transactional
    public Payment createPayment(Payment payment){
        return paymentRepository.save(payment);
    }

    public Optional<Payment> findByBookingId(Long bookingId){
        return paymentRepository.findByBookingId(bookingId);
    }

    // 부스 참가비 Mock 결제 처리
    @Transactional
    public Payment pay(Long bookingId, Long userId, Long requestedAmount, String payMethod){

        // 1. 결제 대상 신청 확인
        BookingInfoResponse booking = bookingClient.getBooking(bookingId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND,
                        "존재하지 않는 예약입니다. bookingId=" + bookingId));

        // 2. 승인되어 결제 가능한 상태인지 확인
        if (!booking.payable()) {
            throw new CustomException(ErrorCode.INVALID_STATE,
                    "결제할 수 없는 신청 상태입니다. bookingId=" + bookingId);
        }

        // 3. 중복 결제 방지
        if (paymentRepository.existsByBookingId(bookingId)){
            throw new CustomException(ErrorCode.DUPLICATE,
                    "이미 결제가 완료된 신청입니다. bookingId=" + bookingId);
        }

        // 4. 요청 금액과 부스들 참가비 합계가 일치하는지 검증
        Long totalFee = booking.totalFee();
        if(!requestedAmount.equals(totalFee)){
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "결제 금액이 참가비 합계와 일치하지 않습니다. 요청: " + requestedAmount + ", 합계: " + totalFee);
        }

        // 5. Mock 결제 처리
        String paymentId = "MOCK-" + UUID.randomUUID();
        PaymentGateway.PaymentGatewayResult result =
                paymentGateway.requestPayment(paymentId, bookingId, requestedAmount);

        // 6. 결제 결과 저장 (부스별 내역 포함)
        Payment payment = Payment.builder()
                .bookingId(bookingId)
                .userId(userId)
                .expoId(booking.expoId())
                .portonePaymentId(paymentId)
                .payMethod(payMethod)
                .amount(requestedAmount)
                .status(PaymentStatus.PENDING)
                .build();

        booking.items().forEach(item -> payment.addItem(item.boothId(), item.fee()));

        if(result.success()){
            payment.approve(paymentId, LocalDateTime.now());
        } else {
            payment.fail(result.failureReason());
        }
        return paymentRepository.save(payment);
    }
}
