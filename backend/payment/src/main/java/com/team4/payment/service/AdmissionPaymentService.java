package com.team4.payment.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.payment.client.AdmissionContext;
import com.team4.payment.client.ReservationClient;
import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.AdmissionPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdmissionPaymentService {

    private final AdmissionPaymentRepository admissionPaymentRepository;
    private final ReservationClient reservationClient;
    private final PaymentGateway paymentGateway;

    // 당일 입장권 Mock 결제 처리
    @Transactional
    public AdmissionPayment pay(Long customerId, Long expoId, Long requestedAmount, String payMethod, String paymentId) {

        // 1. 무료 QR 입장권 보유 여부 + 당일 입장 금액 확인
        AdmissionContext context = reservationClient.getAdmissionContext(customerId, expoId);

        // 2. 이미 무료 QR을 보유한 고객은 결제 대상이 아님
        if (context.hasFreeAdmission()) {
            throw new CustomException(ErrorCode.INVALID_STATE,
                    "이미 무료 입장권을 보유하고 있어 결제할 수 없습니다. customerId=" + customerId + ", expoId=" + expoId);
        }

        // 3. 중복 결제 방지 (동일 고객, 동일 박람회는 1건만)
        if (admissionPaymentRepository.existsByCustomerIdAndExpoId(customerId, expoId)) {
            throw new CustomException(ErrorCode.PAYMENT_ALREADY_COMPLETED,
                    "이미 결제된 당일 입장권이 있습니다. customerId=" + customerId + ", expoId=" + expoId);
        }

        // 4. 요청 금액과 실제 당일 입장 금액이 일치하는지 검증
        if (!requestedAmount.equals(context.admissionFee())) {
            throw new CustomException(ErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    "결제 금액이 입장 금액과 일치하지 않습니다. 요청: " + requestedAmount + ", 입장 금액: " + context.admissionFee());
        }

        // 5. Mock(또는 실제) 결제 게이트웨이 호출
        PaymentGateway.PaymentGatewayResult result =
                paymentGateway.requestPayment(paymentId, "admission:" + expoId + ":" + customerId, requestedAmount);

        // 6. 결제 결과 저장
        AdmissionPayment admissionPayment = AdmissionPayment.builder()
                .customerId(customerId)
                .expoId(expoId)
                .portonePaymentId(paymentId)
                .payMethod(payMethod)
                .amount(requestedAmount)
                .status(PaymentStatus.PENDING)
                .build();

        if (result.success()) {
            admissionPayment.approve(paymentId, LocalDateTime.now());
        } else {
            admissionPayment.fail(result.failureReason());
        }

        AdmissionPayment saved = admissionPaymentRepository.save(admissionPayment);

        // 7. 결제 성공했을 때만 Reservation에 통보해서 입장권(QR)이 발급되게 함.
        if (result.success()) {
            try {
                reservationClient.confirmAdmissionPayment(customerId, expoId, paymentId, saved.getApprovedAt());
            } catch (Exception e) {
                log.error("Reservation 입장권 발급 통보 실패 customerId={}, expoId={}, paymentId={}",
                        customerId, expoId, paymentId, e);
            }
        }

        return saved;
    }
}