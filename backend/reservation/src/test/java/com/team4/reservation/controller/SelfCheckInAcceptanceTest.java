package com.team4.reservation.controller;

import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketStatus;
import com.team4.reservation.repository.CheckInRepository;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 고객 셀프 체크인 - 관리자 스캐너 체크인은 구현하지 않기로 확정, 이 경로가 유일한 체크인 수단이다.
// 본인 소유 + 방문 예약일이 오늘인 티켓만 단일 사용으로 체크인된다.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("셀프 체크인 - 본인 소유 + 방문 예약일 한정 단일 사용 보장")
class SelfCheckInAcceptanceTest {

    private static final long CUSTOMER_ID = 7001L;
    private static final long OTHER_CUSTOMER_ID = 7002L;
    private static final long EXPO_ID = 1L;

    @Autowired MockMvc mockMvc;
    @Autowired TicketRepository ticketRepository;
    @Autowired CheckInRepository checkInRepository;

    @AfterEach
    void cleanUp() {
        checkInRepository.deleteAll();
        ticketRepository.deleteAll();
    }

    private static RequestPostProcessor customer(long userId) {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(userId));
            request.addHeader("X-User-Role", "USER");
            return request;
        };
    }

    private Ticket issueTicket(long customerId, LocalDate visitDate) {
        return ticketRepository.save(Ticket.issueFree(customerId, EXPO_ID, visitDate));
    }

    private String checkInPath(long ticketId) {
        return "/api/customer/reservations/" + ticketId + "/check-in";
    }

    @Test
    @DisplayName("방문 예약일이 오늘인 본인 티켓은 체크인되고 USED로 바뀐다")
    void 정상_체크인() throws Exception {
        Ticket ticket = issueTicket(CUSTOMER_ID, LocalDate.now());

        mockMvc.perform(post(checkInPath(ticket.getId())).with(customer(CUSTOMER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ticketId").value(ticket.getId()))
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID))
                .andExpect(jsonPath("$.data.expoId").value(EXPO_ID));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.USED);
        assertThat(checkInRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("방문 예약일이 오늘이 아니면 409, 티켓 상태는 그대로다")
    void 방문예약일이_아니면_409() throws Exception {
        Ticket ticket = issueTicket(CUSTOMER_ID, LocalDate.now().plusDays(1));

        mockMvc.perform(post(checkInPath(ticket.getId())).with(customer(CUSTOMER_ID)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATE"));

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.ISSUED);
        assertThat(checkInRepository.count()).isEqualTo(0);
    }

    @Test
    @DisplayName("타인 소유 티켓을 체크인하려 하면 403")
    void 타인_티켓_체크인시도_403() throws Exception {
        Ticket ticket = issueTicket(OTHER_CUSTOMER_ID, LocalDate.now());

        mockMvc.perform(post(checkInPath(ticket.getId())).with(customer(CUSTOMER_ID)))
                .andExpect(status().isForbidden());

        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.ISSUED);
    }

    @Test
    @DisplayName("이미 사용된 QR을 다시 체크인하면 409")
    void 이미_사용된_티켓_재체크인시_409() throws Exception {
        Ticket ticket = issueTicket(CUSTOMER_ID, LocalDate.now());

        mockMvc.perform(post(checkInPath(ticket.getId())).with(customer(CUSTOMER_ID)))
                .andExpect(status().isOk());

        mockMvc.perform(post(checkInPath(ticket.getId())).with(customer(CUSTOMER_ID)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATE"));

        assertThat(checkInRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("존재하지 않는 티켓으로 체크인하면 404")
    void 없는_티켓_404() throws Exception {
        mockMvc.perform(post(checkInPath(999_999L)).with(customer(CUSTOMER_ID)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("동시에 같은 티켓을 체크인해도 1건만 성공한다")
    void 동시_체크인_1건만_성공() throws Exception {
        Ticket ticket = issueTicket(CUSTOMER_ID, LocalDate.now());
        int attempts = 10;
        ExecutorService executor = Executors.newFixedThreadPool(attempts);

        Callable<Integer> task = () -> mockMvc.perform(post(checkInPath(ticket.getId())).with(customer(CUSTOMER_ID)))
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
    }

    @Test
    @DisplayName("인증 정보 없이 체크인을 시도하면 401")
    void 인증_없음_401() throws Exception {
        Ticket ticket = issueTicket(CUSTOMER_ID, LocalDate.now());

        mockMvc.perform(post(checkInPath(ticket.getId())))
                .andExpect(status().isUnauthorized());
    }
}
