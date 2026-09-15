package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.client.AiSummaryClient;
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
import java.util.Map;
import java.util.Optional;
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

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 11(#173) / TASK 11-3 Acceptance Test: 리드 상담 메모 -> Gemini 이메일 초안 생성(fail-open).
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 11 Acceptance - Gemini 이메일 초안 생성 (fail-open)")
class LeadEmailSummaryTest {

    private static final long EXHIBITOR_ID = 300L;
    private static final long OTHER_EXHIBITOR_ID = 301L;
    private static final long CUSTOMER_ID = 9201L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired LeadRepository leadRepository;

    @MockBean AiSummaryClient aiSummaryClient;

    private Lead lead;

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
        Expo expo = expoRepository.save(new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10)));
        expo.open();

        Booth booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, EXHIBITOR_ID, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, EXHIBITOR_ID, ApplicationStatus.CONFIRMED));
        booth.assign();
        boothRepository.saveAndFlush(booth);

        LocalDate visitDate = LocalDate.now().plusDays(1);
        Consultation consultation = new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                visitDate, LocalTime.of(14, 0), "상담 부탁드립니다", true);
        consultation.approve();
        consultationRepository.save(consultation);

        lead = leadRepository.save(new Lead(booth, CUSTOMER_ID, consultation, "홍길동", "hong@example.com", null));
    }

    private String body(String consultationNote) {
        try {
            return objectMapper.writeValueAsString(Map.of("consultationNote", consultationNote));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("Gemini 응답이 정상이면 정리된 이메일 본문이 저장된다")
    void 정상_이메일초안_생성() throws Exception {
        when(aiSummaryClient.summarizeForEmail(anyString(), anyString()))
                .thenReturn(Optional.of("안녕하세요, 홍길동 고객님! 정리된 내용입니다."));

        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/summary", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("EV6 관심, 이번 주말 시승 희망")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emailSummary").value("안녕하세요, 홍길동 고객님! 정리된 내용입니다."))
                .andExpect(jsonPath("$.data.interestNote").value("EV6 관심, 이번 주말 시승 희망"));
    }

    @Test
    @DisplayName("Gemini 실패 시 메모 원문을 그대로 이메일 본문 후보로 반환한다(fail-open)")
    void Gemini_실패시_원문_그대로_fail_open() throws Exception {
        when(aiSummaryClient.summarizeForEmail(anyString(), anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/summary", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("EV6 관심, 이번 주말 시승 희망")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emailSummary").value("EV6 관심, 이번 주말 시승 희망"));
    }

    @Test
    @DisplayName("메모(consultationNote)가 비어 있으면 400")
    void 메모_누락_400() throws Exception {
        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/summary", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("타 참가업체가 남의 리드로 요약을 요청하면 403")
    void 타부스_403() throws Exception {
        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/summary", lead.getId()).with(exhibitor(OTHER_EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("EV6 관심")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("재시도 횟수(3회)를 넘기면 409")
    void 재시도_횟수초과_409() throws Exception {
        when(aiSummaryClient.summarizeForEmail(anyString(), anyString())).thenReturn(Optional.empty());

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/exhibitor/leads/{leadId}/summary", lead.getId()).with(exhibitor())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("메모 " + i)))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/summary", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("네 번째 메모")))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("존재하지 않는 리드면 404")
    void 존재하지않는_리드_404() throws Exception {
        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/summary", 999_999L).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("EV6 관심")))
                .andExpect(status().isNotFound());
    }
}
