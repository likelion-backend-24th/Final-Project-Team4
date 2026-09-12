package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.ExpoRepository;
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

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 고객의 상담 신청 수정·취소, 참가업체의 완료·미방문 처리 Acceptance Test.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 6 Acceptance - 상담 신청 수정/취소, 완료/미방문 처리")
class ConsultationLifecycleAcceptanceTest {

    private static final long EXHIBITOR_ID = 100L;
    private static final long OTHER_EXHIBITOR_ID = 200L;
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
        return headers(String.valueOf(CUSTOMER_ID), "USER");
    }

    private static RequestPostProcessor exhibitor(long userId) {
        return headers(String.valueOf(userId), "EXHIBITOR");
    }

    private static RequestPostProcessor headers(String userId, String role) {
        return request -> {
            request.addHeader("X-User-Id", userId);
            request.addHeader("X-User-Role", role);
            return request;
        };
    }

    @BeforeEach
    void setUp() {
        when(reservationClient.hasTicket(anyLong(), anyLong(), org.mockito.ArgumentMatchers.any(LocalDate.class))).thenReturn(true);
        consultationRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    private Expo openExpo() {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("2026 모빌리티 엑스포", "COEX",
                now.minusDays(2), now.plusDays(33), now.minusDays(5), now.plusDays(10));
        expo.open();
        return expoRepository.save(expo);
    }

    private Booth assignedBooth(Expo expo, long exhibitorId, String boothNo) {
        Booth booth = boothRepository.save(new Booth(expo, boothNo, "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, exhibitorId, ApplicationStatus.CONFIRMED));
        booth.assign();
        return boothRepository.saveAndFlush(booth);
    }

    private Consultation requestedConsultation(Booth booth, LocalDate preferredDate) {
        return consultationRepository.save(new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                preferredDate, LocalTime.of(14, 0), "상담 부탁드립니다"));
    }

    private String updateBody(LocalDate preferredDate) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "wantsPurchase", false,
                    "wantsTestDrive", true,
                    "interestedVehicle", "아이오닉5",
                    "hasDriverLicense", true,
                    "preferredDate", preferredDate.toString(),
                    "preferredTime", "15:00:00",
                    "message", "수정된 요청사항"));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ---------------------------------------------------------------------
    // 고객 - 수정
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("대기 중인 상담은 본인이 내용을 수정할 수 있다")
    void 대기중_상담_수정() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().plusDays(1));

        mockMvc.perform(put("/api/customer/consultations/{id}", consultation.getId()).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody(LocalDate.now().plusDays(1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.interestedVehicle").value("아이오닉5"))
                .andExpect(jsonPath("$.data.wantsTestDrive").value(true));
    }

    @Test
    @DisplayName("승인된 상담은 수정할 수 없다")
    void 승인된_상담_수정_불가() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().plusDays(1));
        consultation.approve();
        consultationRepository.save(consultation);

        mockMvc.perform(put("/api/customer/consultations/{id}", consultation.getId()).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody(LocalDate.now().plusDays(1))))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("다른 고객의 상담은 수정할 수 없다")
    void 타인_상담_수정_403() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().plusDays(1));

        mockMvc.perform(put("/api/customer/consultations/{id}", consultation.getId())
                        .with(headers("77777", "USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody(LocalDate.now().plusDays(1))))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------------
    // 고객 - 취소
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("대기 중인 상담은 본인이 취소할 수 있다")
    void 대기중_상담_취소() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().plusDays(1));

        mockMvc.perform(post("/api/customer/consultations/{id}/cancel", consultation.getId()).with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELED"));
    }

    @Test
    @DisplayName("반려된 상담은 취소할 수 없다")
    void 반려된_상담_취소_불가() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().plusDays(1));
        consultation.reject("사유");
        consultationRepository.save(consultation);

        mockMvc.perform(post("/api/customer/consultations/{id}/cancel", consultation.getId()).with(customer()))
                .andExpect(status().isConflict());
    }

    // ---------------------------------------------------------------------
    // 참가업체 - 완료 / 미방문
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("방문 예정일이 지난 승인 상담은 완료 처리할 수 있다")
    void 방문일_지난_승인상담_완료처리() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().minusDays(1));
        consultation.approve();
        consultationRepository.save(consultation);

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/complete", consultation.getId()).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("방문 예정일이 지난 승인 상담은 미방문 처리할 수 있다")
    void 방문일_지난_승인상담_미방문처리() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().minusDays(1));
        consultation.approve();
        consultationRepository.save(consultation);

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/no-show", consultation.getId()).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("NO_SHOW"));

        org.assertj.core.api.Assertions.assertThat(consultationRepository.findById(consultation.getId()).orElseThrow().getStatus())
                .isEqualTo(ConsultationStatus.NO_SHOW);
    }

    @Test
    @DisplayName("방문 예정일 당일에는 완료/미방문 처리할 수 없다")
    void 방문일_당일_처리_불가() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now());
        consultation.approve();
        consultationRepository.save(consultation);

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/complete", consultation.getId()).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/exhibitor/consultations/{id}/no-show", consultation.getId()).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("대기 중(REQUESTED) 상담은 완료/미방문 처리할 수 없다")
    void 대기중_상담_완료처리_불가() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().minusDays(1));

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/complete", consultation.getId()).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("타 업체는 완료/미방문 처리할 수 없다")
    void 타업체_완료처리_403() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Consultation consultation = requestedConsultation(booth, LocalDate.now().minusDays(1));
        consultation.approve();
        consultationRepository.save(consultation);

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/complete", consultation.getId()).with(exhibitor(OTHER_EXHIBITOR_ID)))
                .andExpect(status().isForbidden());
    }
}
