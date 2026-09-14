package com.team4.reservation.controller;

import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketStatus;
import com.team4.reservation.repository.TicketRepository;
import com.team4.reservation.service.TicketService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Expo -> Reservation: 참가업체가 부스에서 고객 QR을 스캔해 리드를 만들 때 고객 식별(TASK 11-1, STORY 11).
// 체크인(selfCheckIn)과 완전히 분리된 읽기 전용 조회 — 상태를 바꾸지 않는다.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("QR 토큰으로 고객 식별 (Expo -> Reservation)")
class TicketResolveInternalApiAcceptanceTest {

    private static final String SVC_TOKEN = "Bearer local_dev_expo_token"; // application-test.yml 미지정 시 service.token.expo 기본값
    private static final long CUSTOMER_ID = 7001L;
    private static final long EXPO_ID = 1L;
    private static final LocalDate VISIT_DATE = LocalDate.of(2026, 10, 1);

    @Autowired MockMvc mockMvc;
    @Autowired TicketRepository ticketRepository;
    @Autowired TicketService ticketService;

    @AfterEach
    void cleanUp() {
        ticketRepository.deleteAll();
    }

    private String path(String qrToken) {
        return "/internal/reservation/tickets/resolve?qrToken=" + qrToken;
    }

    @Test
    @DisplayName("유효한 QR이면 고객·티켓 정보를 반환하고 티켓 상태는 바뀌지 않는다")
    void 유효한_QR_고객_식별() throws Exception {
        Ticket ticket = ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, VISIT_DATE));

        mockMvc.perform(get(path(ticket.getQrToken())).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID))
                .andExpect(jsonPath("$.data.ticketId").value(ticket.getId()))
                .andExpect(jsonPath("$.data.expoId").value(EXPO_ID))
                .andExpect(jsonPath("$.data.visitDate").value(VISIT_DATE.toString()));

        Ticket reloaded = ticketRepository.findById(ticket.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(TicketStatus.ISSUED, reloaded.getStatus());
        org.junit.jupiter.api.Assertions.assertNull(reloaded.getUsedAt());
    }

    @Test
    @Transactional
    @DisplayName("이미 체크인(USED)된 티켓이어도 리드용 조회는 그대로 성공한다")
    void 체크인된_티켓도_조회_성공() throws Exception {
        Ticket ticket = ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, VISIT_DATE));
        ticketRepository.markUsedIfIssued(ticket.getId(), LocalDateTime.now());

        mockMvc.perform(get(path(ticket.getQrToken())).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID));
    }

    @Test
    @DisplayName("존재하지 않는 QR은 404")
    void 존재하지_않는_QR_404() throws Exception {
        mockMvc.perform(get(path("no-such-token")).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("취소(CANCELLED)된 QR은 만료로 취급해 404")
    void 취소된_QR_404() throws Exception {
        Ticket ticket = ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, VISIT_DATE));
        ticketService.cancelTicket(ticket.getId());

        mockMvc.perform(get(path(ticket.getQrToken())).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("SVC_TOKEN이 없거나 틀리면 401")
    void 잘못된_토큰_401() throws Exception {
        Ticket ticket = ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, VISIT_DATE));

        mockMvc.perform(get(path(ticket.getQrToken())).header(HttpHeaders.AUTHORIZATION, "Bearer wrong-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }
}
