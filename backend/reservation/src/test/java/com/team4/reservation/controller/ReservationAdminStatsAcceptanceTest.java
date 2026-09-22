package com.team4.reservation.controller;

import com.team4.reservation.domain.CheckIn;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.repository.CheckInRepository;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 관리자 대시보드용 체크인, 입장권 통계 API
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("관리자 통계 - 일별/시간대별 체크인 수, 입장권 현황, ADMIN 한정")
class ReservationAdminStatsAcceptanceTest {

    private static final long EXPO_ID = 9001L;
    private static final String BASE = "/api/admin/reservation/stats";

    @Autowired MockMvc mockMvc;
    @Autowired TicketRepository ticketRepository;
    @Autowired CheckInRepository checkInRepository;

    @AfterEach
    void cleanUp() {
        checkInRepository.deleteAll();
        ticketRepository.deleteAll();
    }

    private static RequestPostProcessor as(String role) {
        return request -> {
            request.addHeader("X-User-Id", "1");
            request.addHeader("X-User-Role", role);
            return request;
        };
    }

    // 체크인이 가리킬 티켓을 만들어 id를 돌려줌 - 무료/유료 구분 집계 확인용
    private Long freeTicketId(long customerId) {
        return ticketRepository.save(Ticket.issueFree(customerId, EXPO_ID, LocalDate.now())).getId();
    }

    private Long paidTicketId(long customerId) {
        return ticketRepository.save(Ticket.issuePaid(customerId, EXPO_ID, LocalDate.now())).getId();
    }

    @Test
    @DisplayName("일별 체크인 수는 날짜 오름차순, 무료/유료 수 포함, 체크인이 없는 날은 빠진다")
    void 일별_체크인_수() throws Exception {
        LocalDate today = LocalDate.now();
        checkInRepository.save(new CheckIn(freeTicketId(1L), EXPO_ID, today.minusDays(1).atTime(11, 0)));
        checkInRepository.save(new CheckIn(freeTicketId(2L), EXPO_ID, today.atTime(10, 15)));
        checkInRepository.save(new CheckIn(paidTicketId(3L), EXPO_ID, today.atTime(10, 40)));
        checkInRepository.save(new CheckIn(freeTicketId(4L), EXPO_ID + 1, today.atTime(10, 50))); // 다른 박람회는 제외

        mockMvc.perform(get(BASE + "/check-ins").with(as("ADMIN"))
                        .param("expoId", String.valueOf(EXPO_ID))
                        .param("from", today.minusDays(3).toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].date").value(today.minusDays(1).toString()))
                .andExpect(jsonPath("$.data[0].count").value(1))
                .andExpect(jsonPath("$.data[0].free").value(1))
                .andExpect(jsonPath("$.data[0].paid").value(0))
                .andExpect(jsonPath("$.data[1].date").value(today.toString()))
                .andExpect(jsonPath("$.data[1].count").value(2))
                .andExpect(jsonPath("$.data[1].free").value(1))
                .andExpect(jsonPath("$.data[1].paid").value(1));
    }

    @Test
    @DisplayName("시간대별 체크인 수는 해당 날짜의 체크인이 있는 시간대만, 무료/유료 수 포함해 반환한다")
    void 시간대별_체크인_수() throws Exception {
        LocalDate today = LocalDate.now();
        checkInRepository.save(new CheckIn(freeTicketId(1L), EXPO_ID, today.atTime(10, 15)));
        checkInRepository.save(new CheckIn(paidTicketId(2L), EXPO_ID, today.atTime(10, 40)));
        checkInRepository.save(new CheckIn(freeTicketId(3L), EXPO_ID, today.atTime(14, 5)));
        checkInRepository.save(new CheckIn(freeTicketId(4L), EXPO_ID, today.minusDays(1).atTime(10, 0))); // 다른 날짜는 제외

        mockMvc.perform(get(BASE + "/hourly").with(as("ADMIN"))
                        .param("expoId", String.valueOf(EXPO_ID))
                        .param("date", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].hour").value(10))
                .andExpect(jsonPath("$.data[0].count").value(2))
                .andExpect(jsonPath("$.data[0].free").value(1))
                .andExpect(jsonPath("$.data[0].paid").value(1))
                .andExpect(jsonPath("$.data[1].hour").value(14))
                .andExpect(jsonPath("$.data[1].count").value(1))
                .andExpect(jsonPath("$.data[1].free").value(1))
                .andExpect(jsonPath("$.data[1].paid").value(0));
    }

    @Test
    @DisplayName("입장권 현황은 유형별 발급 수(취소 제외)와 체크인 완료 수를 반환한다")
    void 입장권_현황() throws Exception {
        LocalDate today = LocalDate.now();
        Ticket used = ticketRepository.save(Ticket.issueFree(11L, EXPO_ID, today));
        ticketRepository.save(Ticket.issueFree(12L, EXPO_ID, today));
        Ticket cancelled = ticketRepository.save(Ticket.issuePaid(13L, EXPO_ID, today));
        ticketRepository.save(Ticket.issuePaid(14L, EXPO_ID, today));
        ticketRepository.markUsedIfIssued(used.getId(), LocalDateTime.now());
        ticketRepository.markCancelledIfIssued(cancelled.getId());

        mockMvc.perform(get(BASE + "/tickets").with(as("ADMIN")).param("expoId", String.valueOf(EXPO_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.freeIssued").value(2))
                .andExpect(jsonPath("$.data.paidIssued").value(1))
                .andExpect(jsonPath("$.data.used").value(1));
    }

    @Test
    @DisplayName("ADMIN이 아니면 403, 인증 정보가 없으면 401")
    void 권한_확인() throws Exception {
        mockMvc.perform(get(BASE + "/tickets").with(as("USER")).param("expoId", String.valueOf(EXPO_ID)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get(BASE + "/tickets").param("expoId", String.valueOf(EXPO_ID)))
                .andExpect(status().isUnauthorized());
    }
}
