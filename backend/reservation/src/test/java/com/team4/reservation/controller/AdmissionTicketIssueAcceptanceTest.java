package com.team4.reservation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketType;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Payment -> Reservation: 당일 유료 입장권 결제 완료 직후 발급(admission-tickets). "당일"권이므로 오늘 날짜로만
// 발급되고, 이미 같은 날짜에 무료권이 있는데도 호출되면(=Payment가 admission-context를 안 지킨 상태) 막혀야 한다.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("당일 입장권 발급 (Payment -> Reservation)")
class AdmissionTicketIssueAcceptanceTest {

    private static final String SVC_TOKEN = "Bearer local_dev_payment_token";
    private static final long CUSTOMER_ID = 5001L;
    private static final long EXPO_ID = 1L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired TicketRepository ticketRepository;

    @AfterEach
    void cleanUp() {
        ticketRepository.deleteAll();
    }

    private String path(long customerId, long expoId) {
        return "/internal/reservation/customers/" + customerId + "/expos/" + expoId + "/admission-tickets";
    }

    private String body(LocalDate visitDate) throws Exception {
        return objectMapper.writeValueAsString(Map.of("visitDate", visitDate));
    }

    @Test
    @DisplayName("오늘 날짜로 결제 완료 직후 호출하면 PAID 티켓이 발급된다")
    void 정상_발급() throws Exception {
        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID));

        Ticket ticket = ticketRepository.findByCustomerIdAndExpoIdAndVisitDate(CUSTOMER_ID, EXPO_ID, LocalDate.now())
                .orElseThrow();
        assertThat(ticket.getTicketType()).isEqualTo(TicketType.PAID);
    }

    @Test
    @DisplayName("오늘이 아닌 날짜로 발급을 요청하면 400")
    void 당일이_아니면_400() throws Exception {
        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(LocalDate.now().plusDays(1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        assertThat(ticketRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("같은 결제 발급 호출이 재시도되면(이미 PAID 티켓 존재) 멱등하게 같은 티켓을 반환한다")
    void 재시도시_기존_PAID_티켓_반환() throws Exception {
        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(LocalDate.now())))
                .andExpect(status().isOk());

        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(LocalDate.now())))
                .andExpect(status().isOk());

        assertThat(ticketRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("오늘 날짜에 이미 무료 티켓이 있는데 결제 발급이 호출되면 409 (정합성 위반 차단)")
    void 이미_무료권이_있으면_409() throws Exception {
        ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, LocalDate.now()));

        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(LocalDate.now())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATE"));

        assertThat(ticketRepository.findAll()).hasSize(1);
        assertThat(ticketRepository.findAll().get(0).getTicketType()).isEqualTo(TicketType.FREE);
    }

    @Test
    @DisplayName("SVC_TOKEN이 없거나 틀리면 401")
    void 잘못된_토큰_401() throws Exception {
        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, "Bearer wrong-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(LocalDate.now())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }
}
