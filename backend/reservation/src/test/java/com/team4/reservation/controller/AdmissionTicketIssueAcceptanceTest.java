package com.team4.reservation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.reservation.client.ExpoClient;
import com.team4.reservation.client.ExpoInfo;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketType;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Payment -> Reservation: 유료 입장권 결제 완료 직후 발급(admission-tickets). 무료 방문예약과 동일하게
// 날짜를 여러 개 골라 한 번에 발급받을 수 있다. 과거 날짜·박람회 기간 밖 날짜는 거부되어야 한다.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("유료 입장권 발급 (Payment -> Reservation)")
class AdmissionTicketIssueAcceptanceTest {

    private static final String SVC_TOKEN = "Bearer local_dev_payment_token";
    private static final long CUSTOMER_ID = 5001L;
    private static final long EXPO_ID = 1L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired TicketRepository ticketRepository;

    @MockBean ExpoClient expoClient;

    @AfterEach
    void cleanUp() {
        ticketRepository.deleteAll();
    }

    private String path(long customerId, long expoId) {
        return "/internal/reservation/customers/" + customerId + "/expos/" + expoId + "/admission-tickets";
    }

    private String body(LocalDate... visitDates) throws Exception {
        return objectMapper.writeValueAsString(Map.of("visitDates", List.of(visitDates)));
    }

    private void expoRunning(LocalDate periodStart, LocalDate periodEnd) {
        when(expoClient.getExpo(EXPO_ID)).thenReturn(Optional.of(
                new ExpoInfo(EXPO_ID, "OPEN", periodStart.atStartOfDay(), periodEnd.atStartOfDay(), 15_000L)));
    }

    @Test
    @DisplayName("오늘 날짜로 결제 완료 직후 호출하면 PAID 티켓이 발급된다")
    void 정상_발급() throws Exception {
        expoRunning(LocalDate.now().minusDays(1), LocalDate.now().plusDays(2));

        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tickets[0].ticketType").value("PAID"));

        Ticket ticket = ticketRepository.findByCustomerIdAndExpoIdAndVisitDate(CUSTOMER_ID, EXPO_ID, LocalDate.now())
                .orElseThrow();
        assertThat(ticket.getTicketType()).isEqualTo(TicketType.PAID);
    }

    @Test
    @DisplayName("여러 날짜를 한 번에 요청하면 그 수만큼 PAID 티켓이 발급된다")
    void 다중_날짜_발급() throws Exception {
        LocalDate today = LocalDate.now();
        expoRunning(today.minusDays(1), today.plusDays(3));

        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(today, today.plusDays(1), today.plusDays(2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tickets.length()").value(3));

        assertThat(ticketRepository.findAll()).hasSize(3);
        assertThat(ticketRepository.findAll())
                .allMatch(t -> t.getTicketType() == TicketType.PAID);
    }

    @Test
    @DisplayName("이미 지난 날짜가 섞여 있으면 400 (해당 날짜 티켓 발급 안 됨)")
    void 과거_날짜_포함시_400() throws Exception {
        LocalDate today = LocalDate.now();
        expoRunning(today.minusDays(5), today.plusDays(3));

        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(today.minusDays(2), today)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        assertThat(ticketRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("박람회 기간 밖 날짜를 요청하면 400")
    void 기간_밖_날짜_400() throws Exception {
        LocalDate today = LocalDate.now();
        expoRunning(today, today.plusDays(1));

        mockMvc.perform(post(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(today.plusDays(10))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        assertThat(ticketRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("같은 결제 발급 호출이 재시도되면(이미 PAID 티켓 존재) 멱등하게 같은 티켓을 반환한다")
    void 재시도시_기존_PAID_티켓_반환() throws Exception {
        expoRunning(LocalDate.now().minusDays(1), LocalDate.now().plusDays(2));

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
    @DisplayName("특정 날짜에 이미 무료 티켓이 있는데 결제 발급이 호출되면 409 (정합성 위반 차단)")
    void 이미_무료권이_있으면_409() throws Exception {
        expoRunning(LocalDate.now().minusDays(1), LocalDate.now().plusDays(2));
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
