package com.team4.reservation.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.reservation.dto.AdmissionContextResponse;
import com.team4.reservation.dto.IssueAdmissionTicketRequest;
import com.team4.reservation.dto.TicketExistsResponse;
import com.team4.reservation.dto.TicketResponse;
import com.team4.reservation.service.TicketService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 서비스 간 내부 API. Gateway·OpenAPI에 노출하지 않음 - 호출자별 SVC_TOKEN Bearer로만 검증(사용자 토큰/Role 미사용).
@RestController
@RequestMapping("/internal/reservation")
public class ReservationInternalController {

    private final TicketService ticketService;

    @Value("${service.token.payment}")
    private String paymentServiceToken;

    @Value("${service.token.expo}")
    private String expoServiceToken;

    public ReservationInternalController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    // Payment -> Reservation. 당일 유료 입장권 결제 전, 무료 QR 보유 여부와 당일 입장료를 확인.
    @GetMapping("/customers/{customerId}/expos/{expoId}/admission-context")
    public ResponseEntity<ApiResponse<AdmissionContextResponse>> getAdmissionContext(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long customerId,
            @PathVariable Long expoId) {

        requirePaymentService(authorization);

        return ResponseEntity.ok(ApiResponse.success(ticketService.getAdmissionContext(customerId, expoId)));
    }

    // Payment -> Reservation. 당일 유료 입장권 결제 완료 직후, 실제 티켓(QR)을 발급.
    @PostMapping("/customers/{customerId}/expos/{expoId}/admission-tickets")
    public ResponseEntity<ApiResponse<TicketResponse>> issueAdmissionTicket(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long customerId,
            @PathVariable Long expoId,
            @Valid @RequestBody IssueAdmissionTicketRequest request) {

        requirePaymentService(authorization);

        return ResponseEntity.ok(ApiResponse.success(
                ticketService.issueAdmissionTicket(customerId, expoId, request.getVisitDate())));
    }

    // Expo -> Reservation. 상담 신청 접수 시점에 그 날짜 입장권 보유 여부를 확인.
    @GetMapping("/customers/{customerId}/expos/{expoId}/tickets/{visitDate}")
    public ResponseEntity<ApiResponse<TicketExistsResponse>> hasTicketForDate(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long customerId,
            @PathVariable Long expoId,
            @PathVariable LocalDate visitDate) {

        requireExpoService(authorization);

        return ResponseEntity.ok(ApiResponse.success(
                ticketService.hasTicketForDate(customerId, expoId, visitDate)));
    }

    private void requirePaymentService(String authorization) {
        String expected = "Bearer " + paymentServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }

    private void requireExpoService(String authorization) {
        String expected = "Bearer " + expoServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}
