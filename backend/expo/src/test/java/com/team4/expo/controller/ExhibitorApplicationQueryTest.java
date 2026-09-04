package com.team4.expo.controller;

import com.team4.expo.client.PaymentClient;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.Expo;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// TASK 2-6 - 참가업체 본인 신청·결제 상태 조회 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExhibitorApplicationQueryTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ExpoRepository expoRepository;
    @Autowired
    BoothRepository boothRepository;
    @Autowired
    BoothApplicationRepository boothApplicationRepository;
    @Autowired
    BoothApplicationGroupRepository boothApplicationGroupRepository;

    @MockBean
    PaymentClient paymentClient; // 실제 Payment 서비스 안 띄우고 가짜로 대답하게 함

    @BeforeEach
    void clean() {
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    private Expo saveExpo() {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("서울 모빌리티 엑스포", "COEX", now.plusDays(30), now.plusDays(33),
                now.minusDays(5), now.plusDays(10));
        expo.open();
        return expoRepository.save(expo);
    }

    private Booth saveBooth(Expo expo, String boothNo) {
        return boothRepository.save(new Booth(expo, boothNo, "조립 부스", 300_000));
    }

    @Test
    void 본인_신청_내역을_박람회_부스_상태_결제상태와_함께_조회한다() throws Exception {
        when(paymentClient.getPaymentStatus(anyString())).thenReturn(Optional.of("PAID"));

        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "A-101");

        BoothApplicationGroup group = new BoothApplicationGroup(
                expo, 100L, "전기차 충전기", "친환경 모빌리티 솔루션 전시",
                true, false, false, null);
        boothApplicationGroupRepository.save(group);
        boothApplicationRepository.save(new BoothApplication(booth, group, 100L, ApplicationStatus.SUBMITTED));

        mockMvc.perform(get("/api/exhibitor/booth-applications")
                        .header("X-User-Id", "100")
                        .header("X-User-Role", "EXHIBITOR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].groupId").value(group.getId()))
                .andExpect(jsonPath("$.data.content[0].expoTitle").value("서울 모빌리티 엑스포"))
                .andExpect(jsonPath("$.data.content[0].paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.data.content[0].applications[0].boothNo").value("A-101"))
                .andExpect(jsonPath("$.data.content[0].applications[0].status").value("SUBMITTED"));
    }

    @Test
    void 다른_참가업체의_신청_내역은_보이지_않는다() throws Exception {
        when(paymentClient.getPaymentStatus(anyString())).thenReturn(Optional.empty());

        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "A-101");

        BoothApplicationGroup group = new BoothApplicationGroup(
                expo, 999L, "전기차 충전기", "친환경 모빌리티 솔루션 전시",
                true, false, false, null);
        boothApplicationGroupRepository.save(group);
        boothApplicationRepository.save(new BoothApplication(booth, group, 999L, ApplicationStatus.SUBMITTED));

        mockMvc.perform(get("/api/exhibitor/booth-applications")
                        .header("X-User-Id", "100")
                        .header("X-User-Role", "EXHIBITOR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0));
    }

    @Test
    void 신청_내역이_없으면_빈_목록을_반환한다() throws Exception {
        mockMvc.perform(get("/api/exhibitor/booth-applications")
                        .header("X-User-Id", "100")
                        .header("X-User-Role", "EXHIBITOR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0));
    }
}