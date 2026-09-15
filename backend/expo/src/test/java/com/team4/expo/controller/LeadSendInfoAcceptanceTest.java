package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 11(#173) / TASK 11-4 Acceptance Test: 리드 이메일 최종 발송 + 상담 자동 완료 연동.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 11 Acceptance - 리드 이메일 발송 (send-info)")
class LeadSendInfoAcceptanceTest {

    private static final long EXHIBITOR_ID = 400L;
    private static final long OTHER_EXHIBITOR_ID = 401L;
    private static final long CUSTOMER_ID = 9301L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired LeadRepository leadRepository;

    @MockBean IdentityClient identityClient;

    private Lead lead;
    private Consultation consultation;

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

        // 방문 예정일 다음날부터만 완료 처리 가능한 기존 게이트를 우회하는지 검증하려고 preferredDate를 미래로 둠
        LocalDate visitDate = LocalDate.now().plusDays(5);
        consultation = new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                visitDate, LocalTime.of(14, 0), "상담 부탁드립니다", true);
        consultation.approve();
        consultation = consultationRepository.save(consultation);

        lead = leadRepository.save(new Lead(booth, CUSTOMER_ID, consultation, "홍길동", "hong@example.com", "EV6 관심"));
    }

    private String body(String emailBody) {
        try {
            return objectMapper.writeValueAsString(Map.of("emailBody", emailBody));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("발송 성공 시 리드는 SENT, 연결된 APPROVED 상담은 날짜와 무관하게 COMPLETED로 전이한다")
    void 정상_발송_및_자동완료() throws Exception {
        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/send-info", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("정리된 이메일 본문")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SENT"));

        // getExhibitorProfile을 스텁 안 했으면(=회사명 조회 실패) 부스 번호로 대체하는지 함께 검증
        verify(identityClient).sendMail("hong@example.com", "[2026 모빌리티 엑스포] A-101 부스 방문 상담 내용 정리 및 안내", "정리된 이메일 본문");
        assertThat(consultationRepository.findById(consultation.getId()).orElseThrow().getStatus())
                .isEqualTo(ConsultationStatus.COMPLETED);
    }

    @Test
    @DisplayName("참가업체 회사명 조회가 되면 메일 제목에 부스 번호 대신 회사명이 들어간다")
    void 제목에_회사명_포함() throws Exception {
        when(identityClient.getExhibitorProfile(EXHIBITOR_ID)).thenReturn(Optional.of(
                new ExhibitorProfile("전기차 충전기 주식회사", "전기차 충전", "000-00-00000", "홍대표", "ex@example.com")));

        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/send-info", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("정리된 이메일 본문")))
                .andExpect(status().isOk());

        verify(identityClient).sendMail("hong@example.com",
                "[2026 모빌리티 엑스포] 전기차 충전기 주식회사 방문 상담 내용 정리 및 안내", "정리된 이메일 본문");
    }

    @Test
    @DisplayName("Identity 메일 발송이 실패하면 리드 상태는 그대로 유지되고 500을 반환한다")
    void 발송실패_상태유지() throws Exception {
        doThrow(new CustomException(ErrorCode.INTERNAL_ERROR, "메일 발송 실패"))
                .when(identityClient).sendMail(anyString(), anyString(), anyString());

        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/send-info", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("정리된 이메일 본문")))
                .andExpect(status().isInternalServerError());

        Lead reloaded = leadRepository.findById(lead.getId()).orElseThrow();
        assertThat(reloaded.getStatus().name()).isEqualTo("NEW");
        assertThat(consultationRepository.findById(consultation.getId()).orElseThrow().getStatus())
                .isEqualTo(ConsultationStatus.APPROVED);
    }

    @Test
    @DisplayName("타 참가업체가 남의 리드로 발송을 시도하면 403")
    void 타부스_403() throws Exception {
        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/send-info", lead.getId()).with(exhibitor(OTHER_EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("정리된 이메일 본문")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("이메일 본문(emailBody)이 없으면 400")
    void 본문_누락_400() throws Exception {
        mockMvc.perform(post("/api/exhibitor/leads/{leadId}/send-info", lead.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("")))
                .andExpect(status().isBadRequest());
    }
}
