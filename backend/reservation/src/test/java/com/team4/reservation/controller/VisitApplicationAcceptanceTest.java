package com.team4.reservation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.reservation.client.ExpoClient;
import com.team4.reservation.client.ExpoInfo;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 박람회 방문 예약 신청 - 날짜별로 티켓(QR)이 나뉘어 발급되고, 같은 날짜 재신청은 중복 발급되지 않는지,
// 그리고 박람회 시작 전(무료)/이후(유료 미지원) 판정이 맞는지 검증. 실제 Expo 서버는 안 띄우고 ExpoClient를 목킹.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("박람회 방문 예약 - 날짜별 QR 발급")
class VisitApplicationAcceptanceTest {

    private static final long CUSTOMER_ID = 9001L;
    private static final long EXPO_ID = 1L;
    private static final LocalDate DAY_1 = LocalDate.of(2026, 10, 1);
    private static final LocalDate DAY_2 = LocalDate.of(2026, 10, 2);

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired TicketRepository ticketRepository;

    @MockBean ExpoClient expoClient;

    @BeforeEach
    void stubOpenExpoStartingInFuture() {
        // 오늘(테스트 실행 시점) 기준으로 항상 "박람회 시작 전"이 되도록 충분히 먼 미래로 설정 — 기본은 무료 발급 케이스.
        ExpoInfo openFutureExpo = new ExpoInfo(EXPO_ID, "OPEN",
                LocalDateTime.now().plusYears(1), LocalDateTime.now().plusYears(1).plusDays(3), 10_000L);
        when(expoClient.getExpo(EXPO_ID)).thenReturn(Optional.of(openFutureExpo));
    }

    @AfterEach
    void cleanUp() {
        ticketRepository.deleteAll();
    }

    private static RequestPostProcessor customer(long userId) {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(userId));
            request.addHeader("X-User-Role", "USER");
            return request;
        };
    }

    private String applyBody(long expoId, LocalDate... dates) throws Exception {
        return objectMapper.writeValueAsString(Map.of("expoId", expoId, "visitDates", List.of(dates)));
    }

    @Test
    @DisplayName("하루만 신청하면 QR 1장이 발급된다")
    void 하루_신청_QR_1장() throws Exception {
        mockMvc.perform(post("/api/customer/reservations").with(customer(CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(EXPO_ID, DAY_1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.expoId").value(EXPO_ID))
                .andExpect(jsonPath("$.data.tickets.length()").value(1))
                .andExpect(jsonPath("$.data.tickets[0].visitDate").value(DAY_1.toString()))
                .andExpect(jsonPath("$.data.tickets[0].customerId").value(CUSTOMER_ID))
                .andExpect(jsonPath("$.data.tickets[0].qrToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tickets[0].qrImageBase64").isNotEmpty());
    }

    @Test
    @DisplayName("3일짜리 박람회 중 2일을 고르면 QR이 날짜별로 2장 발급된다")
    void 이틀_신청_QR_2장() throws Exception {
        String body = mockMvc.perform(post("/api/customer/reservations").with(customer(CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(EXPO_ID, DAY_1, DAY_2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tickets.length()").value(2))
                .andReturn().getResponse().getContentAsString();

        String qr1 = com.jayway.jsonpath.JsonPath.read(body, "$.data.tickets[0].qrToken");
        String qr2 = com.jayway.jsonpath.JsonPath.read(body, "$.data.tickets[1].qrToken");
        assertThat(qr1).isNotEqualTo(qr2); // 날짜가 다르면 QR도 서로 다름

        assertThat(ticketRepository.findAll()).hasSize(2);
    }

    @Test
    @DisplayName("같은 날짜를 다시 신청해도 기존 QR을 그대로 반환하고 새로 만들지 않는다")
    void 같은_날짜_재신청시_기존_QR_반환() throws Exception {
        String firstQr = applyAndGetFirstQrToken(DAY_1);
        String secondQr = applyAndGetFirstQrToken(DAY_1);

        assertThat(secondQr).isEqualTo(firstQr);
        assertThat(ticketRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("동시에 같은 날짜로 여러 번 신청해도 QR은 1장만 발급된다")
    void 동시_신청_QR_1장만_발급() throws Exception {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        Callable<Void> task = () -> {
            applyAndGetFirstQrToken(DAY_1);
            return null;
        };

        List<Future<Void>> futures = executor.invokeAll(java.util.Collections.nCopies(threadCount, task));
        for (Future<Void> f : futures) {
            f.get();
        }
        executor.shutdown();

        assertThat(ticketRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("박람회가 이미 시작했으면(신청 시점 기준) 무료 발급 대신 409")
    void 박람회_시작후_신청은_409() throws Exception {
        ExpoInfo alreadyStarted = new ExpoInfo(EXPO_ID, "OPEN",
                LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(2), 10_000L);
        when(expoClient.getExpo(EXPO_ID)).thenReturn(Optional.of(alreadyStarted));

        mockMvc.perform(post("/api/customer/reservations").with(customer(CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(EXPO_ID, DAY_1)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATE"));

        assertThat(ticketRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("공개되지 않은(DRAFT) 박람회는 409")
    void 비공개_박람회_신청은_409() throws Exception {
        ExpoInfo draftExpo = new ExpoInfo(EXPO_ID, "DRAFT",
                LocalDateTime.now().plusDays(10), LocalDateTime.now().plusDays(13), 10_000L);
        when(expoClient.getExpo(EXPO_ID)).thenReturn(Optional.of(draftExpo));

        mockMvc.perform(post("/api/customer/reservations").with(customer(CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(EXPO_ID, DAY_1)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("존재하지 않는 박람회로 신청하면 404")
    void 없는_박람회_신청은_404() throws Exception {
        when(expoClient.getExpo(999_999L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/customer/reservations").with(customer(CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(999_999L, DAY_1)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("EXHIBITOR 토큰으로 방문 예약을 시도하면 403")
    void 참가업체가_방문예약_시도_403() throws Exception {
        RequestPostProcessor exhibitor = request -> {
            request.addHeader("X-User-Id", "100");
            request.addHeader("X-User-Role", "EXHIBITOR");
            return request;
        };

        mockMvc.perform(post("/api/customer/reservations").with(exhibitor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(EXPO_ID, DAY_1)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("인증 정보 없이 방문 예약을 시도하면 401")
    void 인증_없음_401() throws Exception {
        mockMvc.perform(post("/api/customer/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(EXPO_ID, DAY_1)))
                .andExpect(status().isUnauthorized());
    }

    private String applyAndGetFirstQrToken(LocalDate date) throws Exception {
        String body = mockMvc.perform(post("/api/customer/reservations").with(customer(CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(EXPO_ID, date)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(body, "$.data.tickets[0].qrToken");
    }
}
