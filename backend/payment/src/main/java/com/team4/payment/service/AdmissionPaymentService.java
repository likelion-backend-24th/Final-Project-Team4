package com.team4.payment.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.payment.client.AdmissionContext;
import com.team4.payment.client.AdmissionTicket;
import com.team4.payment.client.ReservationClient;
import com.team4.payment.dto.AdmissionPaymentTicketDetailResponse;
import com.team4.payment.dto.AdmissionRefundResponse;
import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.AdmissionPaymentTicket;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.AdmissionPaymentRepository;
import com.team4.payment.repository.AdmissionPaymentTicketRepository;
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
    private final AdmissionPaymentTicketRepository admissionPaymentTicketRepository;
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

        // 날짜별 1건분 금액 스냅샷. 위 4번 검증을 통과했으므로 admissionFee와 항상 같지만,
        // 굳이 admissionFee를 그대로 쓰지 않고 요청 금액에서 다시 나눈 값을 쓰는 이유는
        // "결제 금액 기준으로 날짜 수만큼 균등 분배"라는 의도를 코드에 그대로 남기기 위함.
        long perTicketAmount = requestedAmount / visitDates.size();

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
                                .amount(perTicketAmount)
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

    // 마이페이지 "나의 입장권" > 결제 내역 보기. 티켓 1건(날짜 1건) 기준 상세를 돌려준다.
    @Transactional(readOnly = true)
    public AdmissionPaymentTicketDetailResponse getTicketDetail(Long customerId, Long ticketId) {
        AdmissionPaymentTicket ticket = findOwnedTicket(customerId, ticketId);
        return AdmissionPaymentTicketDetailResponse.of(ticket.getAdmissionPayment(), ticket);
    }
    // 마이페이지 "나의 입장권" > 환불 신청. 순서가 중요하다:
    // 1) Reservation 쪽 QR을 먼저 무효화 시도 — 이미 체크인(사용)된 티켓이면 여기서 막혀서
    //    아직 돈에는 손대지 않은 채로 안전하게 실패할 수 있다.
    // 2) QR 무효화에 성공한 뒤에만 포트원 결제 취소(환불)를 호출한다.
    // 3) 결제 취소까지 성공했을 때만 이 서비스 쪽 상태(refundedAt)를 기록한다.
    // 이 순서를 반대로 하면(환불 먼저 처리) "환불은 됐는데 QR은 아직 살아서 입장이 되는" 사고가 날 수 있다.
    @Transactional
    public AdmissionRefundResponse refundTicket(Long customerId, Long ticketId, String reason) {
        AdmissionPaymentTicket ticket = findOwnedTicket(customerId, ticketId);
        AdmissionPayment payment = ticket.getAdmissionPayment();

        // isRefunded()를 결제 상태 체크보다 먼저 본다 — 이 티켓이 이미 환불되어 있으면(그 결과로
        // 결제 전체가 CANCELLED로 넘어간 경우 포함) "결제 완료 상태가 아닙니다"보다
        // "이미 환불됐습니다"가 실제 원인을 더 정확히 알려준다.
        if (ticket.isRefunded()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "이미 환불된 입장권입니다.");
        }
        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new CustomException(ErrorCode.INVALID_STATE, "결제 완료 상태인 입장권만 환불할 수 있습니다.");
        }
        if (ticket.getVisitDate().isBefore(LocalDate.now())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "이미 지난 방문일의 입장권은 환불할 수 없습니다.");
        }

        boolean cancelled = reservationClient.cancelTicket(ticketId);
        if (!cancelled) {
            throw new CustomException(ErrorCode.INVALID_STATE, "이미 사용(체크인)된 입장권은 환불할 수 없습니다.");
        }

        PaymentGateway.RefundResult result =
                paymentGateway.cancelPayment(payment.getPortonePaymentId(), ticket.getAmount(), reason);
        if (!result.success()) {
            // 이 시점엔 이미 Reservation 쪽 QR은 무효화된 상태다. 결제 취소만 실패했으므로
            // 고객 지원팀이 포트원 콘솔에서 직접 취소를 재시도하거나, 이 API를 다시 호출해 재시도할 수 있도록
            // (reservationClient.cancelTicket은 멱등이라 두 번째 호출도 안전) refundedAt은 기록하지 않는다.
            log.error("포트원 결제 취소 실패 - QR은 이미 무효화됨. ticketId={}, paymentId={}, reason={}",
                    ticketId, payment.getPortonePaymentId(), result.failureReason());
            throw new CustomException(ErrorCode.INTERNAL_ERROR, "환불 처리 중 오류가 발생했습니다: " + result.failureReason());
        }

        LocalDateTime now = LocalDateTime.now();
        ticket.markRefunded(reason, now);

        // 이 결제에 딸린 티켓이 전부 환불됐으면(1건짜리 결제였거나, 여러 날짜를 하나씩 다 환불한 경우)
        // 결제 자체도 취소 상태로 남긴다. 일부만 환불된 상태에서는 결제는 여전히 PAID.
        boolean allRefunded = payment.getTickets().stream().allMatch(AdmissionPaymentTicket::isRefunded);
        if (allRefunded) {
            payment.cancel(reason, now);
        }

        return new AdmissionRefundResponse(ticketId, ticket.getAmount(), 0L, "REFUNDED", now);
    }

    private AdmissionPaymentTicket findOwnedTicket(Long customerId, Long ticketId) {
        AdmissionPaymentTicket ticket = admissionPaymentTicketRepository.findByTicketId(ticketId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "결제 내역을 찾을 수 없습니다."));
        if (!ticket.getAdmissionPayment().getCustomerId().equals(customerId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인의 입장권만 조회·환불할 수 있습니다.");
        }
        return ticket;
    }
}