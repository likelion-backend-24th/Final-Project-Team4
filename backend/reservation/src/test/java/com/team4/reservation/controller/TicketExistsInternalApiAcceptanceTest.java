package com.team4.reservation.controller;

import com.team4.reservation.domain.Ticket;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Expo -> Reservation: 상담 신청 접수 시점에 "이 고객이 이 박람회 이 날짜 입장권을 갖고 있는지" 확인(TASK 6-1, #123).
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("입장권 보유 확인 (Expo -> Reservation)")
class TicketExistsInternalApiAcceptanceTest {

    private static final String SVC_TOKEN = "Bearer local_dev_expo_token"; // application-test.yml 미지정 시 service.token.expo 기본값
    private static final long CUSTOMER_ID = 6001L;
    private static final long EXPO_ID = 1L;
    private static final LocalDate VISIT_DATE = LocalDate.of(2026, 10, 1);

    @Autowired MockMvc mockMvc;
    @Autowired TicketRepository ticketRepository;

    @AfterEach
    void cleanUp() {
        ticketRepository.deleteAll();
    }

    private String path(long customerId, long expoId, LocalDate visitDate) {
        return "/internal/reservation/customers/" + customerId + "/expos/" + expoId + "/tickets/" + visitDate;
    }

    @Test
    @DisplayName("그 날짜 티켓을 갖고 있으면 hasTicket=true")
    void 티켓_보유시_true() throws Exception {
        ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, VISIT_DATE));

        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID, VISIT_DATE)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasTicket").value(true));
    }

    @Test
    @DisplayName("결제로 발급된(PAID) 티켓도 hasTicket=true — 타입 무관")
    void 유료티켓도_true() throws Exception {
        ticketRepository.save(Ticket.issuePaid(CUSTOMER_ID, EXPO_ID, VISIT_DATE));

        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID, VISIT_DATE)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasTicket").value(true));
    }

    @Test
    @DisplayName("다른 날짜 티켓만 있으면 hasTicket=false")
    void 다른_날짜만_있으면_false() throws Exception {
        ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, VISIT_DATE.plusDays(1)));

        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID, VISIT_DATE)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasTicket").value(false));
    }

    @Test
    @DisplayName("티켓이 전혀 없으면 hasTicket=false")
    void 티켓_없으면_false() throws Exception {
        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID, VISIT_DATE)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasTicket").value(false));
    }

    @Test
    @DisplayName("SVC_TOKEN이 없거나 틀리면 401")
    void 잘못된_토큰_401() throws Exception {
        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID, VISIT_DATE)).header(HttpHeaders.AUTHORIZATION, "Bearer wrong-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }
}
