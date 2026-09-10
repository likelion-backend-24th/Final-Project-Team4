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
import com.team4.expo.domain.Vehicle;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.ExpoRepository;
import com.team4.expo.repository.VehicleRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 6(#69) / TASK 6-3 Acceptance Test: 참가업체의 차량 상담 신청 조회·승인·반려.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 6 Acceptance - 차량 상담 신청 승인·반려")
class ConsultationReviewAcceptanceTest {

    private static final long EXHIBITOR_ID = 100L;
    private static final long OTHER_EXHIBITOR_ID = 200L;
    private static final long CUSTOMER_ID = 9001L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired VehicleRepository vehicleRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;

    @MockBean ReservationClient reservationClient;

    private static RequestPostProcessor exhibitor(long userId) {
        return headers(String.valueOf(userId), "EXHIBITOR");
    }

    private static RequestPostProcessor customer() {
        return headers(String.valueOf(CUSTOMER_ID), "USER");
    }

    private static RequestPostProcessor headers(String userId, String role) {
        return request -> {
            request.addHeader("X-User-Id", userId);
            request.addHeader("X-User-Role", role);
            return request;
        };
    }

    @BeforeEach
    void clean() {
        consultationRepository.deleteAllInBatch();
        vehicleRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    private Expo openExpo() {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10));
        expo.open();
        return expoRepository.save(expo);
    }

    // exhibitorId가 참가 확정(CONFIRMED)받은 부스 1개 생성
    private Booth assignedBooth(Expo expo, long exhibitorId, String boothNo) {
        Booth booth = boothRepository.save(new Booth(expo, boothNo, "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, exhibitorId, ApplicationStatus.CONFIRMED));
        booth.assign();
        return boothRepository.saveAndFlush(booth);
    }

    private Vehicle vehicleOf(Booth booth) {
        return vehicleRepository.save(new Vehicle(booth, "EV6", "SUV,전기차", 50_000_000L,
                "요약", "설명", "특징", "색상", "500km", "배터리", "파워"));
    }

    private long requestedConsultation(Booth booth, Vehicle vehicle) {
        return consultationRepository.save(new Consultation(booth, vehicle, CUSTOMER_ID,
                true, false, LocalDate.now().plusDays(1), LocalTime.of(14, 0), "상담 부탁드립니다")).getId();
    }

    private ConsultationStatus statusOf(long consultationId) {
        return consultationRepository.findById(consultationId).orElseThrow().getStatus();
    }

    // ---------------------------------------------------------------------
    // 조회
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("참가업체가 본인 부스로 들어온 상담 신청 목록을 조회한다")
    void 본인_부스_신청목록_조회() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Vehicle vehicle = vehicleOf(booth);
        requestedConsultation(booth, vehicle);

        mockMvc.perform(get("/api/exhibitor/consultations").with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].status").value("REQUESTED"));
    }

    @Test
    @DisplayName("담당 부스가 없는 참가업체는 빈 목록을 조회한다")
    void 담당부스_없음_빈목록() throws Exception {
        mockMvc.perform(get("/api/exhibitor/consultations").with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    // ---------------------------------------------------------------------
    // 승인 / 반려
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("본인 부스로 들어온 신청을 승인하면 APPROVED가 된다")
    void 승인시_APPROVED() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Vehicle vehicle = vehicleOf(booth);
        long consultationId = requestedConsultation(booth, vehicle);

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/approve", consultationId).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        org.assertj.core.api.Assertions.assertThat(statusOf(consultationId)).isEqualTo(ConsultationStatus.APPROVED);
    }

    @Test
    @DisplayName("반려하면 사유가 저장되고, 사유가 없으면 400")
    void 반려_사유필수() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Vehicle vehicle = vehicleOf(booth);
        long consultationId = requestedConsultation(booth, vehicle);

        String noReason = objectMapper.writeValueAsString(java.util.Map.of());
        mockMvc.perform(post("/api/exhibitor/consultations/{id}/reject", consultationId).with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON).content(noReason))
                .andExpect(status().isBadRequest());

        String withReason = objectMapper.writeValueAsString(java.util.Map.of("reason", "일정 조율 불가"));
        mockMvc.perform(post("/api/exhibitor/consultations/{id}/reject", consultationId).with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON).content(withReason))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectReason").value("일정 조율 불가"));
    }

    @Test
    @DisplayName("이미 처리된 신청을 다시 승인하면 409")
    void 이미_처리된_신청_재처리_409() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Vehicle vehicle = vehicleOf(booth);
        long consultationId = requestedConsultation(booth, vehicle);

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/approve", consultationId).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/approve", consultationId).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("타 업체의 부스로 들어온 신청을 승인하려 하면 403")
    void 타업체_신청_승인_403() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, EXHIBITOR_ID, "A-101");
        Vehicle vehicle = vehicleOf(booth);
        long consultationId = requestedConsultation(booth, vehicle);

        mockMvc.perform(post("/api/exhibitor/consultations/{id}/approve", consultationId).with(exhibitor(OTHER_EXHIBITOR_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("없는 신청을 승인하면 404")
    void 없는_신청_승인_404() throws Exception {
        mockMvc.perform(post("/api/exhibitor/consultations/{id}/approve", 999_999L).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("인증 없이 조회하면 401, USER 토큰으로 참가업체 API를 호출하면 403")
    void 인증_권한_경계() throws Exception {
        mockMvc.perform(get("/api/exhibitor/consultations"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/exhibitor/consultations").with(customer()))
                .andExpect(status().isForbidden());
    }
}
