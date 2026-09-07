package com.team4.reservation.controller;

import com.team4.reservation.client.ExpoClient;
import com.team4.reservation.client.ExpoInfo;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Payment -> Reservation: 당일 유료 입장권 결제 전 문의(admission-context). 실제 Expo 서버는 안 띄우고 ExpoClient를 목킹.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("당일 입장권 결제 문의 (Payment -> Reservation)")
class AdmissionContextAcceptanceTest {

    private static final String SVC_TOKEN = "Bearer local_dev_payment_token"; // application-test.yml 미지정 시 service.token.payment 기본값
    private static final long CUSTOMER_ID = 5001L;
    private static final long EXPO_ID = 1L;

    @Autowired MockMvc mockMvc;
    @Autowired TicketRepository ticketRepository;

    @MockBean ExpoClient expoClient;

    @AfterEach
    void cleanUp() {
        ticketRepository.deleteAll();
    }

    private String path(long customerId, long expoId) {
        return "/internal/reservation/customers/" + customerId + "/expos/" + expoId + "/admission-context";
    }

    @Test
    @DisplayName("무료 QR을 이미 가진 고객은 hasFreeAdmission=true")
    void 무료_QR_보유시_true() throws Exception {
        when(expoClient.getExpo(EXPO_ID)).thenReturn(Optional.of(
                new ExpoInfo(EXPO_ID, "OPEN", LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(2), 15_000L)));
        ticketRepository.save(Ticket.issueFree(CUSTOMER_ID, EXPO_ID, LocalDate.now()));

        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasFreeAdmission").value(true))
                .andExpect(jsonPath("$.data.admissionFee").value(15_000));
    }

    @Test
    @DisplayName("무료 QR이 없는 고객은 hasFreeAdmission=false, 당일 입장료를 그대로 반환")
    void 무료_QR_없으면_false_입장료_반환() throws Exception {
        when(expoClient.getExpo(EXPO_ID)).thenReturn(Optional.of(
                new ExpoInfo(EXPO_ID, "OPEN", LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(2), 15_000L)));

        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasFreeAdmission").value(false))
                .andExpect(jsonPath("$.data.admissionFee").value(15_000))
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID))
                .andExpect(jsonPath("$.data.expoId").value(EXPO_ID));
    }

    @Test
    @DisplayName("존재하지 않는 박람회는 404")
    void 없는_박람회_404() throws Exception {
        when(expoClient.getExpo(999_999L)).thenReturn(Optional.empty());

        mockMvc.perform(get(path(CUSTOMER_ID, 999_999L)).header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("SVC_TOKEN이 없거나 틀리면 401")
    void 잘못된_토큰_401() throws Exception {
        mockMvc.perform(get(path(CUSTOMER_ID, EXPO_ID)).header(HttpHeaders.AUTHORIZATION, "Bearer wrong-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }
}
