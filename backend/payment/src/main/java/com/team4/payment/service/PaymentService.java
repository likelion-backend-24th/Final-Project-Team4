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

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final BookingClient bookingClient;
    private final PaymentGateway paymentGateway;

    @Transactional
    public Payment createPayment(Payment payment){
        return paymentRepository.save(payment);
    }

    public Optional<Payment> findByBookingId(String bookingId){
        return paymentRepository.findByBookingId(bookingId);
    }

    // 부스 참가비 결제 처리 (실제 포트원 검증 + Expo 확정 통보)
    @Transactional
    public Payment pay(String bookingId, Long userId, Long requestedAmount, String payMethod, String paymentId){

        // 1. 결제 대상 신청(그룹) 확인
        BookingInfoResponse booking = bookingClient.getBooking(bookingId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND,
                        "존재하지 않는 신청입니다. bookingId=" + bookingId));

        // 2. 본인 신청이 맞는지 확인
        if (!userId.equals(booking.applicantId())) {
            throw new CustomException(ErrorCode.FORBIDDEN,
                    "본인의 신청 건만 결제할 수 있습니다.");
        }

        // 3. 승인되어 결제 가능한 상태인지 확인
        if (!booking.payable()) {
            throw new CustomException(ErrorCode.INVALID_STATE,
                    "결제할 수 없는 신청 상태입니다. bookingId=" + bookingId);
        }

        // 4. 중복 결제 방지
        if (paymentRepository.existsByBookingId(bookingId)){
            throw new CustomException(ErrorCode.DUPLICATE,
                    "이미 결제가 완료된 신청입니다. bookingId=" + bookingId);
        }

        // 5. 요청 금액과 부스들 참가비 합계가 일치하는지 검증
        Long totalFee = booking.totalFee();
        if(!requestedAmount.equals(totalFee)){
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "결제 금액이 참가비 합계와 일치하지 않습니다. 요청: " + requestedAmount + ", 합계: " + totalFee);
        }

        // 6. 포트원 실제 결제 검증 (프론트에서 이미 결제창을 통해 완료된 paymentId를 검증)
        PaymentGateway.PaymentGatewayResult result =
                paymentGateway.requestPayment(paymentId, bookingId, requestedAmount);

        // 7. 결제 결과 저장 (부스별 내역 포함)
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

        Payment saved = paymentRepository.save(payment);

        // 8. 결제 성공했을 때만 Expo에 확정 통보 (여기서 실패해도 이미 저장된 결제 기록은 그대로 둠)
        if (result.success()) {
            try {
                bookingClient.confirm(bookingId, paymentId, saved.getApprovedAt());
            } catch (Exception e) {
                log.error("Expo 확정 통보 실패 bookingId={}, paymentId={}", bookingId, paymentId, e);
            }
        }

        return saved;
    }
}