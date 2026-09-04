package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.client.PaymentClient;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 2 Acceptance Test: 승인 -> 결제 -> 참가 확정.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 2 Acceptance - 승인부터 참가 확정까지")
class ApproveConfirmAcceptanceTest {

    // application-test.yml 미지정 시 service.token.payment 기본값
    private static final String SVC_TOKEN = "Bearer local_dev_payment_token";
    private static final long EXHIBITOR_ID = 100L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;

    @MockBean PaymentClient paymentClient;

    private static RequestPostProcessor admin() {
        return headers("1", "ADMIN");
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
    void clean() {
        when(paymentClient.getPaymentStatus(anyString())).thenReturn(Optional.empty());
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    // ---- 데이터 준비 (신청 접수 이후 상태부터 시작) ----

    private Expo openExpo() {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10));
        expo.open();
        return expoRepository.save(expo);
    }

    private Booth saveBooth(Expo expo, String boothNo) {
        return boothRepository.save(new Booth(expo, boothNo, "조립 부스", 3_000_000));
    }

    private BoothApplicationGroup saveGroup(Expo expo, long exhibitorId) {
        return boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시",
                true, false, false, null));
    }

    // SUBMITTED 신청 1건을 만들어 applicationId 반환
    private long saveSubmitted(BoothApplicationGroup group, Booth booth) {
        return boothApplicationRepository.save(
                new BoothApplication(booth, group, group.getExhibitorId(), ApplicationStatus.SUBMITTED)).getId();
    }

    private ApplicationStatus applicationStatus(long applicationId) {
        return boothApplicationRepository.findById(applicationId).orElseThrow().getStatus();
    }

    private BoothStatus boothStatus(long boothId) {
        return boothRepository.findById(boothId).orElseThrow().getStatus();
    }

    private void approve(long applicationId) throws Exception {
        mockMvc.perform(post("/api/admin/booth-applications/{id}/approve", applicationId).with(admin()))
                .andExpect(status().isOk());
    }

    private String confirmBody() {
        try {
            return objectMapper.writeValueAsString(java.util.Map.of(
                    "paymentId", "pay-" + System.nanoTime(),
                    "paidAt", LocalDateTime.now().toString()));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ---------------------------------------------------------------------
    // 심사 (승인 / 반려)
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("SUBMITTED 신청을 승인하면 PAYMENT_PENDING 이고 부스가 RESERVED 로 잠긴다")
    void 승인시_PAYMENT_PENDING_부스_RESERVED() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        long applicationId = saveSubmitted(saveGroup(expo, EXHIBITOR_ID), booth);

        mockMvc.perform(post("/api/admin/booth-applications/{id}/approve", applicationId).with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAYMENT_PENDING"));

        assertThat(applicationStatus(applicationId)).isEqualTo(ApplicationStatus.PAYMENT_PENDING);
        assertThat(boothStatus(booth.getId())).isEqualTo(BoothStatus.RESERVED);
    }

    @Test
    @DisplayName("SUBMITTED 가 아닌 신청 승인 요청은 409")
    void 잘못된_상태_승인_409() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        long applicationId = boothApplicationRepository.save(
                new BoothApplication(booth, group, EXHIBITOR_ID, ApplicationStatus.PAYMENT_PENDING)).getId();

        mockMvc.perform(post("/api/admin/booth-applications/{id}/approve", applicationId).with(admin()))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("없는 신청 승인 요청은 404")
    void 없는_신청_승인_404() throws Exception {
        mockMvc.perform(post("/api/admin/booth-applications/{id}/approve", 999_999L).with(admin()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("반려하면 REJECTED + 사유가 저장되고 참가업체가 사유를 조회할 수 있다")
    void 반려시_사유저장_참가업체_조회() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        long applicationId = saveSubmitted(group, booth);

        String body = objectMapper.writeValueAsString(java.util.Map.of("reason", "제출 서류 미비"));
        mockMvc.perform(post("/api/admin/booth-applications/{id}/reject", applicationId).with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectReason").value("제출 서류 미비"));

        mockMvc.perform(get("/api/exhibitor/booth-applications/groups/{groupId}", group.getId())
                        .with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applications[0].rejectReason").value("제출 서류 미비"));
    }

    // ---------------------------------------------------------------------
    // 결제 완료 콜백 - 자리 확정
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("결제 완료 콜백이 오면 CONFIRMED 이고 부스가 ASSIGNED 된다")
    void 결제완료_콜백시_CONFIRMED_부스_ASSIGNED() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        long applicationId = saveSubmitted(group, booth);
        approve(applicationId);

        mockMvc.perform(post("/internal/expo/booth-application-groups/{groupId}/confirm", group.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON).content(confirmBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.results[0].status").value("CONFIRMED"));

        assertThat(applicationStatus(applicationId)).isEqualTo(ApplicationStatus.CONFIRMED);
        assertThat(boothStatus(booth.getId())).isEqualTo(BoothStatus.ASSIGNED);
    }

    @Test
    @DisplayName("confirm 재요청은 멱등이며 CONFIRMED 상태를 유지한다")
    void confirm_멱등() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        long applicationId = saveSubmitted(group, booth);
        approve(applicationId);

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/internal/expo/booth-application-groups/{groupId}/confirm", group.getId())
                            .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                            .contentType(MediaType.APPLICATION_JSON).content(confirmBody()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.results[0].status").value("CONFIRMED"));
        }

        assertThat(applicationStatus(applicationId)).isEqualTo(ApplicationStatus.CONFIRMED);
        assertThat(boothStatus(booth.getId())).isEqualTo(BoothStatus.ASSIGNED);
    }

    @Test
    @DisplayName("승인된 신청이 없는 그룹을 confirm 하면 409")
    void 승인건_없는_그룹_confirm_409() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        saveSubmitted(group, booth); // 승인 전(SUBMITTED)

        mockMvc.perform(post("/internal/expo/booth-application-groups/{groupId}/confirm", group.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON).content(confirmBody()))
                .andExpect(status().isConflict());
    }

    // ---------------------------------------------------------------------
    // 자리 경쟁 / 결제 실패
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("같은 부스에 이미 승인 진행 중인 신청이 있으면 다른 신청 승인은 409")
    void 자리_경쟁_승인_차단_409() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        long first = saveSubmitted(saveGroup(expo, 100L), booth);
        long second = saveSubmitted(saveGroup(expo, 200L), booth);

        approve(first); // booth RESERVED

        mockMvc.perform(post("/api/admin/booth-applications/{id}/approve", second).with(admin()))
                .andExpect(status().isConflict());
        assertThat(applicationStatus(second)).isEqualTo(ApplicationStatus.SUBMITTED);
    }

    @Test
    @DisplayName("결제 실패 release 콜백이 오면 부스는 AVAILABLE 로 풀리고 신청은 REJECTED")
    void 결제실패_release_부스_AVAILABLE_신청_REJECTED() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        long applicationId = saveSubmitted(group, booth);
        approve(applicationId); // booth RESERVED

        mockMvc.perform(post("/internal/expo/booth-application-groups/{groupId}/release", group.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("reason", "결제 기한 초과"))))
                .andExpect(status().isOk());

        assertThat(applicationStatus(applicationId)).isEqualTo(ApplicationStatus.REJECTED);
        assertThat(boothStatus(booth.getId())).isEqualTo(BoothStatus.AVAILABLE);
    }

    // ---------------------------------------------------------------------
    // 결제 컨텍스트 (Payment -> Expo)
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("payment-context 는 심사 중이면 reviewComplete=false, 승인 후 items·금액을 반환한다")
    void payment_context_심사전후() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        long applicationId = saveSubmitted(group, booth);

        mockMvc.perform(get("/internal/expo/booth-application-groups/{groupId}/payment-context", group.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewComplete").value(false))
                .andExpect(jsonPath("$.data.items.length()").value(0));

        approve(applicationId);

        mockMvc.perform(get("/internal/expo/booth-application-groups/{groupId}/payment-context", group.getId())
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewComplete").value(true))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.totalAmount").value(3_000_000));
    }

    // ---------------------------------------------------------------------
    // 권한 / 내부 인증 경계
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("내부 API 는 서비스 토큰이 없거나 틀리면 401")
    void 내부_API_서비스토큰_검증() throws Exception {
        Expo expo = openExpo();
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);

        mockMvc.perform(get("/internal/expo/booth-application-groups/{groupId}/payment-context", group.getId()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/internal/expo/booth-application-groups/{groupId}/payment-context", group.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer wrong-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("참가업체 토큰으로 관리자 승인 API 를 호출하면 403")
    void 참가업체가_승인API_호출_403() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        long applicationId = saveSubmitted(saveGroup(expo, EXHIBITOR_ID), booth);

        mockMvc.perform(post("/api/admin/booth-applications/{id}/approve", applicationId).with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("타인 신청 그룹 상세를 조회하면 403")
    void 타인_신청그룹_조회_403() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveBooth(expo, "A-101");
        BoothApplicationGroup group = saveGroup(expo, EXHIBITOR_ID);
        saveSubmitted(group, booth);

        mockMvc.perform(get("/api/exhibitor/booth-applications/groups/{groupId}", group.getId())
                        .with(exhibitor(999L)))
                .andExpect(status().isForbidden());
    }
}
