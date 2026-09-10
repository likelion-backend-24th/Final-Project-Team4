package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 6(#69) / TASK 6-3 Acceptance Test: 고객의 차량 구매/시승 상담 신청 제출·조회.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 6 Acceptance - 차량 상담 신청 제출·조회")
class ConsultationApplyAcceptanceTest {

    private static final long EXHIBITOR_ID = 100L;
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
    void setUp() {
        when(reservationClient.hasTicket(anyLong(), anyLong(), any(LocalDate.class))).thenReturn(true);
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

    // 참가 확정(ASSIGNED)된 부스 1개 생성 - 상담 신청 대상 부스로 씀
    private Booth assignedBooth(Expo expo) {
        Booth booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, EXHIBITOR_ID, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, EXHIBITOR_ID, ApplicationStatus.CONFIRMED));
        booth.assign();
        return boothRepository.saveAndFlush(booth);
    }

    private Vehicle vehicleOf(Booth booth) {
        return vehicleRepository.save(new Vehicle(booth, "EV6", "SUV,전기차", 50_000_000L,
                "요약", "설명", "특징", "색상", "500km", "배터리", "파워"));
    }

    private String applyBody(long boothId, long vehicleId, boolean wantsPurchase, boolean wantsTestDrive) {
        return body(java.util.Map.of(
                "boothId", boothId,
                "vehicleId", vehicleId,
                "wantsPurchase", wantsPurchase,
                "wantsTestDrive", wantsTestDrive,
                "preferredDate", LocalDate.now().plusDays(1).toString(),
                "preferredTime", "14:00:00",
                "message", "상담 부탁드립니다"));
    }

    private String body(Map<String, ?> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ---------------------------------------------------------------------
    // 정상 흐름
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("참가 확정 부스의 차량에 구매 상담을 신청하면 REQUESTED로 접수된다")
    void 정상_상담신청() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Vehicle vehicle = vehicleOf(booth);

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), vehicle.getId(), true, false)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("REQUESTED"))
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID));
    }

    @Test
    @DisplayName("신청 내역이 마이페이지 목록에 조회된다")
    void 내_상담신청_목록조회() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Vehicle vehicle = vehicleOf(booth);

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), vehicle.getId(), false, true)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/customer/consultations").with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].wantsTestDrive").value(true));
    }

    // ---------------------------------------------------------------------
    // 실패 흐름
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("구매/시승 둘 다 선택하지 않으면 400")
    void 토글_둘다_false_400() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Vehicle vehicle = vehicleOf(booth);

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), vehicle.getId(), false, false)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("필수값(preferredDate)이 없으면 400")
    void 필수값_누락_400() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Vehicle vehicle = vehicleOf(booth);

        String missing = body(java.util.Map.of(
                "boothId", booth.getId(),
                "vehicleId", vehicle.getId(),
                "wantsPurchase", true,
                "wantsTestDrive", false,
                "preferredTime", "14:00:00"));

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(missing))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("참가 확정(ASSIGNED)되지 않은 부스에 신청하면 409")
    void 미확정_부스_신청_409() throws Exception {
        Expo expo = openExpo();
        Booth booth = boothRepository.save(new Booth(expo, "A-102", "조립 부스", 3_000_000)); // AVAILABLE 상태
        Vehicle vehicle = vehicleOf(booth);

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), vehicle.getId(), true, false)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("vehicleId가 해당 부스 소속이 아니면 404")
    void 타부스_차량_404() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Booth otherBooth = boothRepository.save(new Booth(expo, "A-999", "조립 부스", 3_000_000));
        Vehicle otherVehicle = vehicleOf(otherBooth);

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), otherVehicle.getId(), true, false)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("신청 날짜에 입장권이 없으면 409")
    void 입장권_없음_409() throws Exception {
        when(reservationClient.hasTicket(anyLong(), anyLong(), any(LocalDate.class))).thenReturn(false);

        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Vehicle vehicle = vehicleOf(booth);

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), vehicle.getId(), true, false)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Reservation 조회 실패 시 fail-closed로 202(DEPENDENCY_TIMEOUT) 처리되고 신청은 열리지 않는다")
    void 입장권_조회실패_fail_closed_202() throws Exception {
        when(reservationClient.hasTicket(anyLong(), anyLong(), any(LocalDate.class)))
                .thenThrow(new CustomException(ErrorCode.DEPENDENCY_TIMEOUT));

        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Vehicle vehicle = vehicleOf(booth);

        mockMvc.perform(post("/api/customer/consultations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), vehicle.getId(), true, false)))
                .andExpect(status().isAccepted());

        org.assertj.core.api.Assertions.assertThat(consultationRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("인증 정보(X-User-* 헤더)가 없으면 401")
    void 인증_없음_401() throws Exception {
        mockMvc.perform(get("/api/customer/consultations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("EXHIBITOR 토큰으로 고객 상담 신청 API를 호출하면 403")
    void 참가업체가_고객API_호출_403() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo);
        Vehicle vehicle = vehicleOf(booth);

        mockMvc.perform(post("/api/customer/consultations").with(headers(String.valueOf(EXHIBITOR_ID), "EXHIBITOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(booth.getId(), vehicle.getId(), true, false)))
                .andExpect(status().isForbidden());
    }
}
