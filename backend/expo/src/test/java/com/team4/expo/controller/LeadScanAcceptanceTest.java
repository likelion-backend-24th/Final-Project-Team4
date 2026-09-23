package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.CustomerContact;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.client.TicketResolveResult;
import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothApplicationGroup;
import com.team4.expo.consultation.domain.Consultation;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.lead.domain.Lead;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.expo.repository.ExpoRepository;
import com.team4.expo.lead.repository.LeadRepository;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 11(#173) / TASK 11-2 Acceptance Test: 참가업체 QR 스캔 -> 리드 생성/조회.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 11 Acceptance - Expo 리드 생성/조회 (QR 스캔)")
class LeadScanAcceptanceTest {

    private static final long EXHIBITOR_ID = 200L;
    private static final long OTHER_EXHIBITOR_ID = 201L;
    private static final long CUSTOMER_ID = 9101L;
    private static final String QR_TOKEN = "qr-token-abc";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired LeadRepository leadRepository;

    @MockBean ReservationClient reservationClient;
    @MockBean IdentityClient identityClient;

    private Expo expo;
    private Booth booth;
    private LocalDate visitDate;

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

        visitDate = LocalDate.now().plusDays(1);

        when(reservationClient.resolveTicket(anyString()))
                .thenReturn(new TicketResolveResult(CUSTOMER_ID, 500L, expo.getId(), visitDate));
        when(identityClient.getCustomerContact(anyLong()))
                .thenReturn(Optional.of(new CustomerContact("홍길동", "hong@example.com")));
    }

    private Consultation approvedConsultation(boolean leadConsent) {
        Consultation consultation = new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                visitDate, LocalTime.of(14, 0), "상담 부탁드립니다", leadConsent);
        consultation.approve();
        return consultationRepository.save(consultation);
    }

    private String scanBody() {
        try {
            return objectMapper.writeValueAsString(Map.of("qrToken", QR_TOKEN));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("동의한 승인된 상담 신청이 있는 고객 QR을 스캔하면 리드가 생성된다")
    void 정상_스캔_리드생성() throws Exception {
        Consultation consultation = approvedConsultation(true);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID))
                .andExpect(jsonPath("$.data.customerName").value("홍길동"))
                .andExpect(jsonPath("$.data.customerEmail").value("hong@example.com"))
                .andExpect(jsonPath("$.data.consultationId").value(consultation.getId()));

        assertThat(leadRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("같은 QR(같은 customerId+boothId)을 재스캔하면 새로 만들지 않고 기존 리드를 반환한다")
    void 재스캔_멱등() throws Exception {
        approvedConsultation(true);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isOk());

        assertThat(leadRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("동의(leadConsent)한 승인된 상담 신청이 없으면 409")
    void 미동의_또는_미승인_409() throws Exception {
        approvedConsultation(false); // leadConsent=false

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isConflict());

        assertThat(leadRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("사전 상담 신청 자체가 없는 워크인 QR 스캔은 동의 없이도 방문 기록(Lead)이 생성된다 - TASK 7-1(2026-09-16 확정)")
    void 워크인_스캔_리드생성() throws Exception {
        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(CUSTOMER_ID))
                .andExpect(jsonPath("$.data.consultationId").value(org.hamcrest.Matchers.nullValue()));

        assertThat(leadRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("다른 박람회의 QR이면 409")
    void 타박람회_QR_409() throws Exception {
        approvedConsultation(true);
        when(reservationClient.resolveTicket(anyString()))
                .thenReturn(new TicketResolveResult(CUSTOMER_ID, 500L, expo.getId() + 999, visitDate));

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("만료/미존재 QR이면 404")
    void 유효하지않은_QR_404() throws Exception {
        when(reservationClient.resolveTicket(anyString()))
                .thenThrow(new CustomException(ErrorCode.NOT_FOUND, "유효하지 않은 QR입니다."));

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Reservation 조회 실패 시 fail-closed로 202 처리되고 리드는 생성되지 않는다")
    void Reservation_조회실패_202() throws Exception {
        approvedConsultation(true);
        when(reservationClient.resolveTicket(anyString()))
                .thenThrow(new CustomException(ErrorCode.DEPENDENCY_TIMEOUT));

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isAccepted());

        assertThat(leadRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("타 참가업체 부스로 리드 스캔·조회를 시도하면 403")
    void 타부스_403() throws Exception {
        approvedConsultation(true);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor(OTHER_EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor(OTHER_EXHIBITOR_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("본인 부스 리드 목록을 조회할 수 있다")
    void 리드목록_조회() throws Exception {
        approvedConsultation(true);
        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].customerId").value(CUSTOMER_ID));
    }

    private static RequestPostProcessor customer() {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(CUSTOMER_ID));
            request.addHeader("X-User-Role", "USER");
            return request;
        };
    }

    @Test
    @DisplayName("고객은 본인이 방문 기록을 남긴 부스 목록을 조회할 수 있다 - TASK 7-1")
    void 방문부스_목록조회() throws Exception {
        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/leads", booth.getId()).with(exhibitor())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/customer/expos/{expoId}/visited-booths", expo.getId()).with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].boothId").value(booth.getId()))
                .andExpect(jsonPath("$.data[0].boothNo").value(booth.getBoothNo()));
    }

    @Test
    @DisplayName("같은 부스를 여러 날 방문해도 부스는 1건이고, 후기 마감일은 작성 가능한 방문 중 가장 늦은 기한이다")
    void 방문부스_후기마감일() throws Exception {
        LocalDate expired = LocalDate.now().minusDays(10);
        LocalDate recent = LocalDate.now().minusDays(1);
        leadRepository.save(new Lead(booth, CUSTOMER_ID, expired, null, "고객", "c@test.com", null, true));
        leadRepository.save(new Lead(booth, CUSTOMER_ID, recent, null, "고객", "c@test.com", null, true));

        mockMvc.perform(get("/api/customer/expos/{expoId}/visited-booths", expo.getId()).with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].reviewDeadline").value(recent.plusDays(5).toString()));
    }

    @Test
    @DisplayName("방문 기록이 없으면 방문 부스 목록은 빈 배열이다")
    void 방문부스_없음_빈목록() throws Exception {
        mockMvc.perform(get("/api/customer/expos/{expoId}/visited-booths", expo.getId()).with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("로그인하지 않으면 방문 부스 목록 조회는 401")
    void 방문부스_비로그인_401() throws Exception {
        mockMvc.perform(get("/api/customer/expos/{expoId}/visited-booths", expo.getId()))
                .andExpect(status().isUnauthorized());
    }
}
