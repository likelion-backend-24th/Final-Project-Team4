package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothApplicationGroup;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.expo.repository.ExpoRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 참가업체가 날짜·시간 슬롯마다 지정한 상담 접수 정원(2026-09-20) Acceptance Test.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("상담 접수 정원(날짜·시간 슬롯별)")
class ConsultationSlotCapacityAcceptanceTest {

    private static final long EXHIBITOR_ID = 100L;
    private static final long OTHER_EXHIBITOR_ID = 101L;
    private static final String DATE = LocalDate.now().plusDays(1).toString();

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;

    @MockBean ReservationClient reservationClient;

    private static RequestPostProcessor as(long userId, String role) {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(userId));
            request.addHeader("X-User-Role", role);
            return request;
        };
    }

    @BeforeEach
    void setUp() {
        when(reservationClient.hasTicket(anyLong(), anyLong(), any(LocalDate.class))).thenReturn(true);
        consultationRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    private Booth assignedBooth() {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("2026 모빌리티 엑스포", "COEX", now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10));
        expo.open();
        expo = expoRepository.save(expo);
        Booth booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, EXHIBITOR_ID, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, EXHIBITOR_ID, ApplicationStatus.CONFIRMED));
        booth.assign();
        return boothRepository.saveAndFlush(booth);
    }

    private String json(Map<String, ?> map) throws Exception {
        return objectMapper.writeValueAsString(map);
    }

    private org.springframework.test.web.servlet.ResultActions apply(long customerId, long boothId, String time) throws Exception {
        return mockMvc.perform(post("/api/customer/consultations").with(as(customerId, "USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.ofEntries(
                        Map.entry("boothIds", List.of(boothId)),
                        Map.entry("customerName", "홍길동"),
                        Map.entry("customerPhone", "010-1234-5678"),
                        Map.entry("customerEmail", "hong@example.com"),
                        Map.entry("wantsPurchase", true),
                        Map.entry("wantsTestDrive", false),
                        Map.entry("hasDriverLicense", true),
                        Map.entry("preferredDate", DATE),
                        Map.entry("preferredTime", time),
                        Map.entry("leadConsent", true)))));
    }

    private void saveSettings(long boothId, int defaultCapacity, List<Map<String, Object>> slots) throws Exception {
        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/consultation-slots", boothId).with(as(EXHIBITOR_ID, "EXHIBITOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("defaultCapacity", defaultCapacity, "slots", slots))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("지정이 없으면 부스 기본값 1건 - 같은 시간대 두 번째 신청은 409, 다른 시간대는 가능")
    void 기본정원_1건() throws Exception {
        Booth booth = assignedBooth();

        apply(9001, booth.getId(), "14:00:00").andExpect(status().isCreated());
        apply(9002, booth.getId(), "14:00:00").andExpect(status().isConflict());
        apply(9002, booth.getId(), "14:30:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("허용된 시간대(10:00~16:00, 30분 단위) 밖의 시각은 400 - 14:01로 정원을 우회할 수 없다")
    void 허용되지_않은_시각_400() throws Exception {
        Booth booth = assignedBooth();

        apply(9001, booth.getId(), "14:01:00").andExpect(status().isBadRequest());
        apply(9001, booth.getId(), "12:00:00").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("이미 지난 날짜로는 신청할 수 없다(400)")
    void 지난_날짜_400() throws Exception {
        Booth booth = assignedBooth();

        mockMvc.perform(post("/api/customer/consultations").with(as(9001, "USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.ofEntries(
                                Map.entry("boothIds", List.of(booth.getId())),
                                Map.entry("customerName", "홍길동"),
                                Map.entry("customerPhone", "010-1234-5678"),
                                Map.entry("customerEmail", "hong@example.com"),
                                Map.entry("wantsPurchase", true),
                                Map.entry("wantsTestDrive", false),
                                Map.entry("hasDriverLicense", true),
                                Map.entry("preferredDate", LocalDate.now().minusDays(1).toString()),
                                Map.entry("preferredTime", "14:00:00"),
                                Map.entry("leadConsent", true)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("슬롯 정원을 2건으로 지정하면 2건까지 받고 3번째는 409")
    void 슬롯정원_2건() throws Exception {
        Booth booth = assignedBooth();
        saveSettings(booth.getId(), 1, List.of(Map.of("date", DATE, "time", "14:00:00", "capacity", 2)));

        apply(9001, booth.getId(), "14:00:00").andExpect(status().isCreated());
        apply(9002, booth.getId(), "14:00:00").andExpect(status().isCreated());
        apply(9003, booth.getId(), "14:00:00").andExpect(status().isConflict());
    }

    @Test
    @DisplayName("슬롯 정원을 0으로 지정하면 그 시간대는 마감")
    void 슬롯정원_0_마감() throws Exception {
        Booth booth = assignedBooth();
        saveSettings(booth.getId(), 5, List.of(Map.of("date", DATE, "time", "14:00:00", "capacity", 0)));

        apply(9001, booth.getId(), "14:00:00").andExpect(status().isConflict());
        apply(9001, booth.getId(), "14:30:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("취소하면 자리가 반환되어 다른 고객이 신청할 수 있다")
    void 취소하면_자리_반환() throws Exception {
        Booth booth = assignedBooth();

        String body = apply(9001, booth.getId(), "14:00:00").andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long consultationId = objectMapper.readTree(body).path("data").get(0).path("consultationId").asLong();

        apply(9002, booth.getId(), "14:00:00").andExpect(status().isConflict());

        mockMvc.perform(post("/api/customer/consultations/{id}/cancel", consultationId).with(as(9001, "USER")))
                .andExpect(status().isOk());

        apply(9002, booth.getId(), "14:00:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("잔여 조회 - 정원을 지정했거나 신청이 있는 시간대만 내려오고 나머지는 기본 정원")
    void 잔여_조회() throws Exception {
        Booth booth = assignedBooth();
        saveSettings(booth.getId(), 3, List.of(Map.of("date", DATE, "time", "14:00:00", "capacity", 2)));
        apply(9001, booth.getId(), "14:00:00").andExpect(status().isCreated());
        apply(9002, booth.getId(), "15:00:00").andExpect(status().isCreated());

        mockMvc.perform(get("/api/customer/consultations/booths/{boothId}/slots", booth.getId())
                        .param("date", DATE).with(as(9001, "USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.defaultCapacity").value(3))
                .andExpect(jsonPath("$.data.slots.length()").value(2))
                .andExpect(jsonPath("$.data.slots[0].time").value("14:00:00"))
                .andExpect(jsonPath("$.data.slots[0].capacity").value(2))
                .andExpect(jsonPath("$.data.slots[0].booked").value(1))
                .andExpect(jsonPath("$.data.slots[1].capacity").value(3))
                .andExpect(jsonPath("$.data.slots[1].booked").value(1));
    }

    @Test
    @DisplayName("정원 설정 조회/저장은 본인 부스만 가능(타인 403)하고, 저장은 기존 슬롯 설정을 교체한다")
    void 설정_저장_조회_권한() throws Exception {
        Booth booth = assignedBooth();
        saveSettings(booth.getId(), 2, List.of(Map.of("date", DATE, "time", "14:00:00", "capacity", 4)));
        saveSettings(booth.getId(), 2, List.of(Map.of("date", DATE, "time", "15:00:00", "capacity", 1)));

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/consultation-slots", booth.getId()).with(as(EXHIBITOR_ID, "EXHIBITOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.defaultCapacity").value(2))
                .andExpect(jsonPath("$.data.slots.length()").value(1))
                .andExpect(jsonPath("$.data.slots[0].time").value("15:00:00"));

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/consultation-slots", booth.getId()).with(as(OTHER_EXHIBITOR_ID, "EXHIBITOR")))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/consultation-slots", booth.getId()).with(as(OTHER_EXHIBITOR_ID, "EXHIBITOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("defaultCapacity", 9, "slots", List.of()))))
                .andExpect(status().isForbidden());
    }
}
