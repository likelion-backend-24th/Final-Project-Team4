package com.team4.payment.controller;

import com.team4.common.security.GatewayUser;
import com.team4.payment.dto.AdmissionPaymentTicketDetailResponse;
import com.team4.payment.dto.AdmissionRefundResponse;
import com.team4.payment.dto.RefundRequest;
import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.service.AdmissionPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/customer/admission-payments")
@RequiredArgsConstructor
public class AdmissionPaymentController {

    private final AdmissionPaymentService admissionPaymentService;

    // 결제 대상 고객은 클라이언트가 body로 보낸 값이 아니라 Gateway가 JWT에서 꺼내 주입한
    // X-User-Id 헤더로만 정한다 — body의 customerId를 믿으면 로그인한 사용자가 남의 id로
    // 결제/티켓 발급을 시킬 수 있음.
    @PostMapping
    public AdmissionPayment pay(@AuthenticationPrincipal GatewayUser customer,
                                @RequestBody AdmissionPaymentRequest request) {
        return admissionPaymentService.pay(
                customer.getId(),
                request.expoId(),
                request.visitDates(),
                request.amount(),
                request.payMethod(),
                request.paymentId()
        );
    }

    // 마이페이지 "나의 입장권" > "..." 메뉴 > 결제 내역 보기
    @GetMapping("/tickets/{ticketId}")
    public AdmissionPaymentTicketDetailResponse getTicketDetail(@AuthenticationPrincipal GatewayUser customer,
                                                                @PathVariable Long ticketId){
        return admissionPaymentService.getTicketDetail(customer.getId(), ticketId);
    }

    // 마이페이지 "나의 입장권" > "..." 메뉴 > 환불 신청
    @PostMapping("/tickets/{ticketId}/refund")
    public AdmissionRefundResponse refundTicket(@AuthenticationPrincipal GatewayUser customer,
                                                @PathVariable Long ticketId,
                                                @RequestBody RefundRequest request) {
        return admissionPaymentService.refundTicket(customer.getId(), ticketId, request.getReason());
    }

    public record AdmissionPaymentRequest(
            Long expoId,
            List<LocalDate> visitDates,
            Long amount,
            String payMethod,
            String paymentId
    ) {}
}
