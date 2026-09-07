package com.team4.reservation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketStatus;
import com.team4.reservation.repository.CheckInRepository;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 현장 QR 스캔 체크인 - 티켓은 특정 (expoId, visitDate)로 발급되므로, 발급된 박람회에서만 체크인이 성공해야 하고
// 한 번 체크인되면(USED) 같은 박람회에서 다시 찍어도 차단되어야 한다.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("QR 체크인 - 발급된 박람회 한정 단일 사용 보장")
class CheckInAcceptanceTest {

    private static final long CUSTOMER_ID = 7001L;
    private static final long EXPO_A = 1L;
    private static final long EXPO_B = 2L;
    private static final LocalDate VISIT_DATE = LocalDate.of(2026, 10, 1);

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired TicketRepository ticketRepository;
    @Autowired CheckInRepository checkInRepository;

    @AfterEach
    void cleanUp() {
        checkInRepository.deleteAll();
        ticketRepository.deleteAll();
    }

    private static RequestPostProcessor admin() {
        return headers("1", "ADMIN");
    }

    private static RequestPostProcessor customer(long userId) {
        return headers(String.valueOf(userId), "USER");
    }

    private static RequestPostProcessor headers(String userId, String role) {
        return request -> {
            request.addHeader("X-User-Id", userId);
            request.addHeader("X-User-Role", role);
            return request;
        };
    }

    private Ticket issueTicket(long expoId) {
        return ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, expoId, VISIT_DATE));
    }

    private String checkInBody(String qrToken, long expoId) throws Exception {
        return objectMapper.writeValueAsString(Map.of("qrToken", qrToken, "expoId", expoId));
    }

    @Test
    @DisplayName("발급된 박람회에서 찍으면 체크인되고 티켓은 USED로 바뀐다")
    void 정상_체크인() throws Exception {
        Ticket ticket = issueTicket(EXPO_A);

        mockMvc.perform(post("/api/admin/reservation/check-ins").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody(ticket.getQrToken(), EXPO_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ticketId").value(ticket.getId()))
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID))
                .andExpect(jsonPath("$.data.expoId").value(EXPO_A));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.USED);
        assertThat(checkInRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("발급된 박람회가 아닌 다른 박람회에서 찍으면 409, 티켓 상태는 그대로다")
    void 다른_박람회에서_체크인시도시_409() throws Exception {
        Ticket ticket = issueTicket(EXPO_A);

        mockMvc.perform(post("/api/admin/reservation/check-ins").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody(ticket.getQrToken(), EXPO_B)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATE"));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.ISSUED); // 잘못된 박람회라 상태 전이 자체가 안 일어남
        assertThat(checkInRepository.count()).isEqualTo(0);
    }

    @Test
    @DisplayName("같은 박람회에서 이미 사용된 QR을 다시 찍으면 409")
    void 같은_박람회_재사용시_409() throws Exception {
        Ticket ticket = issueTicket(EXPO_A);

        mockMvc.perform(post("/api/admin/reservation/check-ins").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody(ticket.getQrToken(), EXPO_A)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/reservation/check-ins").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody(ticket.getQrToken(), EXPO_A)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATE"));

        assertThat(checkInRepository.count()).isEqualTo(1); // 두 번째 체크인은 기록되지 않음
    }

    @Test
    @DisplayName("존재하지 않는 QR로 체크인하면 404")
    void 없는_QR_404() throws Exception {
        mockMvc.perform(post("/api/admin/reservation/check-ins").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody("no-such-qr-token", EXPO_A)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("동시에 같은 박람회에서 같은 QR을 찍어도 체크인은 1건만 성공한다")
    void 동시_체크인_1건만_성공() throws Exception {
        Ticket ticket = issueTicket(EXPO_A);
        int attempts = 10;
        ExecutorService executor = Executors.newFixedThreadPool(attempts);

        Callable<Integer> task = () -> mockMvc.perform(post("/api/admin/reservation/check-ins").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody(ticket.getQrToken(), EXPO_A)))
                .andReturn().getResponse().getStatus();

        java.util.List<Future<Integer>> futures = executor.invokeAll(java.util.Collections.nCopies(attempts, task));
        long successCount = 0;
        for (Future<Integer> f : futures) {
            if (f.get() == 200) {
                successCount++;
            }
        }
        executor.shutdown();

        assertThat(successCount).isEqualTo(1);
        assertThat(checkInRepository.count()).isEqualTo(1);
        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.USED);
    }

    @Test
    @DisplayName("USER 토큰으로 체크인을 시도하면 403")
    void 일반고객_체크인_시도_403() throws Exception {
        Ticket ticket = issueTicket(EXPO_A);

        mockMvc.perform(post("/api/admin/reservation/check-ins").with(customer(CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody(ticket.getQrToken(), EXPO_A)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("인증 정보 없이 체크인을 시도하면 401")
    void 인증_없음_401() throws Exception {
        Ticket ticket = issueTicket(EXPO_A);

        mockMvc.perform(post("/api/admin/reservation/check-ins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInBody(ticket.getQrToken(), EXPO_A)))
                .andExpect(status().isUnauthorized());
    }
}
