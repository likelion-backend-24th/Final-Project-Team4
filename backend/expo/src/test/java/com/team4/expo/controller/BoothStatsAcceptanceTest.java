package com.team4.expo.controller;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.Lead;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.ExpoRepository;
import com.team4.expo.repository.LeadRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.junit.jupiter.api.BeforeEach;
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

// TASK 참가업체 부스 통계 Acceptance Test: 상담 상태별 건수 + 방문자(Lead) 수.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Acceptance - 참가업체 부스 통계")
class BoothStatsAcceptanceTest {

    private static final long EXHIBITOR_ID = 400L;
    private static final long OTHER_EXHIBITOR_ID = 401L;
    private static final long CUSTOMER_ID = 9401L;

    @Autowired MockMvc mockMvc;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired LeadRepository leadRepository;

    private Expo expo;
    private Booth booth;

    private static RequestPostProcessor exhibitor() {
        return exhibitor(EXHIBITOR_ID);
    }

    private static RequestPostProcessor exhibitor(long exhibitorId) {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(exhibitorId));
            request.addHeader("X-User-Role", "EXHIBITOR");
            return request;
        };
    }

    @BeforeEach
    void setUp() {
        leadRepository.deleteAllInBatch();
        consultationRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();

        LocalDateTime now = LocalDateTime.now();
        expo = expoRepository.save(new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10)));
        expo.open();

        booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, EXHIBITOR_ID, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, EXHIBITOR_ID, ApplicationStatus.CONFIRMED));
        booth.assign();
        boothRepository.saveAndFlush(booth);
    }

    private Consultation consultation() {
        return new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                LocalDate.now().plusDays(1), LocalTime.of(14, 0), "상담 부탁드립니다", true);
    }

    @Test
    @DisplayName("상담 상태별 건수와 방문자 수를 집계한다")
    void 정상_통계집계() throws Exception {
        Consultation requested = consultationRepository.save(consultation());

        Consultation approved = consultation();
        approved.approve();
        consultationRepository.save(approved);

        Consultation completed = consultation();
        completed.approve();
        completed.complete();
        consultationRepository.save(completed);

        Consultation rejected = consultation();
        rejected.reject("일정상 어려움");
        consultationRepository.save(rejected);

        LocalDate visitDate = LocalDate.now().minusDays(1);
        leadRepository.save(new Lead(booth, CUSTOMER_ID, visitDate, requested, "홍길동", "hong@example.com", null));
        leadRepository.save(new Lead(booth, CUSTOMER_ID + 1, visitDate, null, "김철수", "kim@example.com", null));

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/stats", booth.getId()).with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.boothNo").value("A-101"))
                .andExpect(jsonPath("$.data.requestedCount").value(1))
                .andExpect(jsonPath("$.data.approvedCount").value(1))
                .andExpect(jsonPath("$.data.completedCount").value(1))
                .andExpect(jsonPath("$.data.rejectedCount").value(1))
                .andExpect(jsonPath("$.data.noShowCount").value(0))
                .andExpect(jsonPath("$.data.visitCount").value(2));
    }

    @Test
    @DisplayName("본인 부스가 아니면 통계 조회는 403")
    void 타부스_통계조회_403() throws Exception {
        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/stats", booth.getId()).with(exhibitor(OTHER_EXHIBITOR_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("인증 없이 통계 조회는 401")
    void 비로그인_통계조회_401() throws Exception {
        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/stats", booth.getId()))
                .andExpect(status().isUnauthorized());
    }
}
