package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothApplicationGroup;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.consultation.domain.Consultation;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.repository.ExpoRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// AI 후기 초안(draftReview) 재시도 횟수 제한(MAX_REVIEW_DRAFT_RETRY=3) 검증 - 2026-09-23 토큰 비용 감사 후 추가.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("AI 후기 초안 재시도 횟수 제한")
class ConsultationReviewDraftRetryAcceptanceTest {

    private static final long EXHIBITOR_ID = 100L;
    private static final long CUSTOMER_ID = 9001L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;

    @MockBean ReservationClient reservationClient;

    private static RequestPostProcessor customer() {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(CUSTOMER_ID));
            request.addHeader("X-User-Role", "USER");
            return request;
        };
    }

    @BeforeEach
    void clean() {
        consultationRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    // 상담 COMPLETED + 5일 이내(후기 작성 자격 충족)인 건을 바로 만든다 - approve()/complete()는 서비스 레이어에서
    // 상태·날짜를 검증하지만, 엔티티 메서드 자체는 열려있어 테스트에서 직접 전이시켜도 안전하다.
    private long reviewableConsultation() {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = expoRepository.save(new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10)));
        expo.open();

        Booth booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, EXHIBITOR_ID, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, EXHIBITOR_ID, ApplicationStatus.CONFIRMED));
        booth.assign();
        boothRepository.saveAndFlush(booth);

        Consultation consultation = new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                LocalDate.now().minusDays(1), LocalTime.of(14, 0), "상담 부탁드립니다", false);
        consultation.approve();
        consultation.complete();
        return consultationRepository.save(consultation).getId();
    }

    @Test
    @DisplayName("AI 후기 초안을 3회 생성하면 4번째부터 409")
    void 재시도_횟수_초과시_409() throws Exception {
        long consultationId = reviewableConsultation();
        String body = objectMapper.writeValueAsString(Map.of("reviewType", "CONSULT", "vehicleName", "EV6"));

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/customer/consultations/{id}/review-draft", consultationId).with(customer())
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/customer/consultations/{id}/review-draft", consultationId).with(customer())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }
}
