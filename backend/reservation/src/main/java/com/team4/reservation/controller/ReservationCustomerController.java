package com.team4.reservation.controller;

import com.team4.common.response.ApiResponse;
import com.team4.reservation.dto.CheckInResponse;
import com.team4.reservation.dto.TicketResponse;
import com.team4.reservation.dto.VisitApplicationRequest;
import com.team4.reservation.dto.VisitApplicationResponse;
import com.team4.reservation.security.GatewayUser;
import com.team4.reservation.service.CheckInService;
import com.team4.reservation.service.TicketService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReservationCustomerController {

    private final TicketService ticketService;
    private final CheckInService checkInService;

    public ReservationCustomerController(TicketService ticketService, CheckInService checkInService) {
        this.ticketService = ticketService;
        this.checkInService = checkInService;
    }

    // 박람회 방문 예약 신청. 날짜를 여러 개 고르면 그만큼 티켓(QR)이 발급됨.
    @PostMapping("/api/customer/reservations")
    public ResponseEntity<ApiResponse<VisitApplicationResponse>> applyVisit(
            @AuthenticationPrincipal GatewayUser customer,
            @Valid @RequestBody VisitApplicationRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                ticketService.applyVisit(customer.getId(), request.getExpoId(), request.getVisitDates())));
    }

    // 마이페이지 "나의 입장권" 목록 조회
    @GetMapping("/api/customer/reservations")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> listMyTickets(
            @AuthenticationPrincipal GatewayUser customer) {

        return ResponseEntity.ok(ApiResponse.success(ticketService.listMyTickets(customer.getId())));
    }

    // 고객 셀프 체크인 — 본인 소유 티켓 + 방문 예약일이 오늘일 때만 성공(그 외 CheckInService에서 403/409).
    @PostMapping("/api/customer/reservations/{ticketId}/check-in")
    public ResponseEntity<ApiResponse<CheckInResponse>> checkInMyTicket(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long ticketId) {

        return ResponseEntity.ok(ApiResponse.success(checkInService.selfCheckIn(customer.getId(), ticketId)));
    }
}
