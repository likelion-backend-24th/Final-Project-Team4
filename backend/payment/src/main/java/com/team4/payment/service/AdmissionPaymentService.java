package com.team4.payment.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.payment.client.AdmissionContext;
import com.team4.payment.client.AdmissionTicket;
import com.team4.payment.client.ReservationClient;
import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.AdmissionPaymentTicket;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.AdmissionPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdmissionPaymentService {

    private final AdmissionPaymentRepository admissionPaymentRepository;
    private final ReservationClient reservationClient;
    private final PaymentGateway paymentGateway;

    // 유료 입장권 Mock 결제 처리 — 무료 방문예약처럼 날짜를 여러 개 선택해 한 번에 결제하면
    // 결제 금액은 1일 입장료 × 선택한 날짜 수, 결제 완료 후 그 수만큼 티켓이 각각 발급된다.
    @Transactional
    public AdmissionPayment pay(Long customerId, Long expoId, List<LocalDate> visitDates,
                                 Long requestedAmount, String payMethod, String paymentId) {

        // 1. 지난 날짜가 섞여 있으면 결제 자체를 막는다 — Reservation의 issueAdmissionTicket도 과거 날짜를
        //    거부하지만, 그건 결제(paymentGateway 호출) 이후 단계라 여기서 안 막으면 "결제는 성공, 티켓은
        //    미발급"으로 돈만 받는 사고가 난다(Reservation 발급 실패를 삼키는 7번 단계 때문에 조용히 묻힘).
        LocalDate today = LocalDate.now();
        visitDates.stream()
                .filter(visitDate -> visitDate.isBefore(today))
                .findFirst()
                .ifPresent(pastDate -> {
                    throw new CustomException(ErrorCode.VALIDATION_ERROR,
                            "이미 지난 날짜(" + pastDate + ")로는 결제할 수 없습니다.");
                });

        // 2. 요청한 날짜들 중 이미 티켓을 가진 날짜(blockedDates) + 1일 입장료 확인
        AdmissionContext context = reservationClient.getAdmissionContext(customerId, expoId, visitDates);

        // 3. 하나라도 이미 티켓(QR)이 있는 날짜가 섞여 있으면 그 결제를 막는다(같은 날짜 재구매 방지).
        //    "고객당 박람회당 결제 1건"처럼 통째로 막지는 않음 — 날짜가 겹치지만 않으면 같은 박람회를
        //    여러 번에 나눠 결제하는 것도 허용(예: 오늘 하루치 사고, 나중에 나머지 날짜 추가로 결제).
        if (!context.blockedDates().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_STATE,
                    "이미 입장권을 보유한 날짜가 포함되어 있어 결제할 수 없습니다. blockedDates=" + context.blockedDates());
        }

        // 4. 요청 금액과 실제 입장 금액(1일 입장료 × 날짜 수)이 일치하는지 검증
        long expectedAmount = context.admissionFee() * visitDates.size();
        if (!requestedAmount.equals(expectedAmount)) {
            throw new CustomException(ErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    "결제 금액이 입장 금액과 일치하지 않습니다. 요청: " + requestedAmount + ", 입장 금액: " + expectedAmount);
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

            // 7. 결제 성공 직후 Reservation에 선택한 날짜 수만큼 실제 입장권(QR) 발급 요청.
            //    Reservation 장애로 발급이 실패해도 이미 완료된 결제 자체는 그대로 저장되어야 하므로 예외를 삼킴
            //    (티켓 정보가 비어있는 채로 저장되면, 추후 재시도/재발급 대상이 됨).
            try {
                List<AdmissionTicket> tickets = reservationClient.issueAdmissionTicket(customerId, expoId, visitDates);
                tickets.forEach(ticket -> admissionPayment.addTicket(
                        AdmissionPaymentTicket.builder()
                                .visitDate(ticket.visitDate())
                                .ticketId(ticket.ticketId())
                                .qrToken(ticket.qrToken())
                                .qrImageBase64(ticket.qrImageBase64())
                                .build()));
            } catch (Exception e) {
                log.error("Reservation 입장권 발급 실패 customerId={}, expoId={}, paymentId={}",
                        customerId, expoId, paymentId, e);
            }
        } else {
            admissionPayment.fail(result.failureReason());
        }

        return admissionPaymentRepository.save(admissionPayment);
    }
}
