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
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 7(#70) / TASK 7-2, STORY 8(#71) / TASK 8-3 Acceptance Test:
// Review -> Expo 내부 API(review-eligibility)의 reviewType별 자격 판단.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("TASK 7-2/8-3 Acceptance - 후기 작성 자격 내부 API")
class ExpoInternalReviewEligibilityTest {

    private static final long EXHIBITOR_ID = 300L;
    private static final long CUSTOMER_ID = 9301L;
    private static final String SVC_TOKEN = "Bearer local_dev_review_token";

    @Autowired MockMvc mockMvc;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired LeadRepository leadRepository;

    private Expo expo;
    private Booth booth;

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

    private void perform(String reviewType, boolean expectedEligible) throws Exception {
        mockMvc.perform(get("/internal/expo/booths/{boothId}/review-eligibility", booth.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .param("customerId", String.valueOf(CUSTOMER_ID))
                        .param("reviewType", reviewType))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(expectedEligible))
                .andExpect(jsonPath("$.data.boothNo").value(booth.getBoothNo()));
    }

    @Test
    @DisplayName("CONSULT: 완료된 상담이 있으면 eligible=true")
    void 상담후기_완료상담_eligible() throws Exception {
        Consultation consultation = new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                LocalDate.now().plusDays(1), LocalTime.of(14, 0), "상담 부탁드립니다", true);
        consultation.approve();
        consultation.complete();
        consultationRepository.save(consultation);

        perform("CONSULT", true);
    }

    @Test
    @DisplayName("CONSULT: 완료된 상담이 없으면 eligible=false (방문 기록만 있어도 상담후기는 불가)")
    void 상담후기_상담없음_ineligible() throws Exception {
        leadRepository.save(new Lead(booth, CUSTOMER_ID, null, "홍길동", "hong@example.com", null));

        perform("CONSULT", false);
    }

    @Test
    @DisplayName("BOOTH: 방문 기록(Lead)이 있으면 상담 없이도 eligible=true")
    void 부스후기_방문기록_eligible() throws Exception {
        leadRepository.save(new Lead(booth, CUSTOMER_ID, null, "홍길동", "hong@example.com", null));

        perform("BOOTH", true);
    }

    @Test
    @DisplayName("BOOTH: 방문 기록이 없으면 eligible=false")
    void 부스후기_방문기록없음_ineligible() throws Exception {
        perform("BOOTH", false);
    }

    @Test
    @DisplayName("서비스 토큰이 없거나 틀리면 401")
    void 서비스토큰_검증() throws Exception {
        mockMvc.perform(get("/internal/expo/booths/{boothId}/review-eligibility", booth.getId())
                        .param("customerId", String.valueOf(CUSTOMER_ID))
                        .param("reviewType", "BOOTH"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/internal/expo/booths/{boothId}/review-eligibility", booth.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer wrong-token")
                        .param("customerId", String.valueOf(CUSTOMER_ID))
                        .param("reviewType", "BOOTH"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("존재하지 않는 부스면 404")
    void 부스없음_404() throws Exception {
        mockMvc.perform(get("/internal/expo/booths/{boothId}/review-eligibility", booth.getId() + 9999)
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .param("customerId", String.valueOf(CUSTOMER_ID))
                        .param("reviewType", "BOOTH"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("owned-by: 참가 확정된 본인 부스면 owned=true, 다른 참가업체면 owned=false")
    void 부스소유여부_확인() throws Exception {
        mockMvc.perform(get("/internal/expo/booths/{boothId}/owned-by", booth.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .param("exhibitorId", String.valueOf(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.owned").value(true));

        mockMvc.perform(get("/internal/expo/booths/{boothId}/owned-by", booth.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .param("exhibitorId", String.valueOf(EXHIBITOR_ID + 999)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.owned").value(false));
    }
}
