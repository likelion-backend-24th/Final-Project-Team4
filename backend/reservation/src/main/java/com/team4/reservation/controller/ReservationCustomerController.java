package com.team4.reservation.controller;

import com.team4.common.response.ApiResponse;
import com.team4.reservation.dto.VisitApplicationRequest;
import com.team4.reservation.dto.VisitApplicationResponse;
import com.team4.reservation.security.GatewayUser;
import com.team4.reservation.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReservationCustomerController {

    private final TicketService ticketService;

    public ReservationCustomerController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    // 박람회 방문 예약 신청. 날짜를 여러 개 고르면 그만큼 티켓(QR)이 발급됨.
    @PostMapping("/api/customer/reservations")
    public ResponseEntity<ApiResponse<VisitApplicationResponse>> applyVisit(
            @AuthenticationPrincipal GatewayUser customer,
            @Valid @RequestBody VisitApplicationRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                ticketService.applyVisit(customer.getId(), request.getExpoId(), request.getVisitDates())));
    }
}
