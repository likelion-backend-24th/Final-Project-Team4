package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.Expo;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// TASK 1-8 - 관리자 박람회·신청 현황 조회 API (a8006f4) 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("관리자 박람회/부스/신청 조회")
class AdminExpoQueryAcceptanceTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;

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
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    private Expo openExpo(String title) {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo(title, "COEX", now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10));
        expo.open();
        return expoRepository.save(expo);
    }

    private Expo draftExpo(String title) {
        LocalDateTime now = LocalDateTime.now();
        return expoRepository.save(new Expo(title, "COEX", now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10)));
    }

    private Booth saveBooth(Expo expo, String boothNo) {
        return boothRepository.save(new Booth(expo, boothNo, "조립 부스", 1_000_000));
    }

    private BoothApplicationGroup saveGroup(Expo expo, long exhibitorId) {
        return boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시",
                true, false, false, null));
    }

    private long saveSubmitted(BoothApplicationGroup group, Booth booth, long exhibitorId) {
        return boothApplicationRepository.save(
                new BoothApplication(booth, group, exhibitorId, ApplicationStatus.SUBMITTED)).getId();
    }

    private void approve(long applicationId) throws Exception {
        mockMvc.perform(post("/api/admin/booth-applications/{id}/approve", applicationId).with(admin()))
                .andExpect(status().isOk());
    }

    private void reject(long applicationId, String reason) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("reason", reason));
        mockMvc.perform(post("/api/admin/booth-applications/{id}/reject", applicationId).with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
    }

    // ---------------------------------------------------------------------
    // GET /api/admin/expos - 박람회별 신청 현황 집계
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("박람회별 부스·신청 현황을 대기/승인/반려로 집계해서 보여준다")
    void 박람회_신청현황_집계() throws Exception {
        Expo expo = openExpo("집계 테스트 박람회");
        Booth pendingBooth = saveBooth(expo, "A-1");   // SUBMITTED - 아직 심사 전이라 부스는 AVAILABLE 유지
        Booth approvedBooth = saveBooth(expo, "A-2");  // 승인 -> RESERVED
        Booth rejectedBooth = saveBooth(expo, "A-3");  // 반려 -> 부스는 AVAILABLE 유지
        saveBooth(expo, "A-4");                        // 신청 없음 -> AVAILABLE

        saveSubmitted(saveGroup(expo, 100L), pendingBooth, 100L);
        approve(saveSubmitted(saveGroup(expo, 200L), approvedBooth, 200L));
        reject(saveSubmitted(saveGroup(expo, 300L), rejectedBooth, 300L), "서류 미비");

        // 승인(RESERVED)된 A-2만 제외 -> A-1, A-3, A-4 총 3개가 AVAILABLE
        mockMvc.perform(get("/api/admin/expos").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)].totalBooths", expo.getId()).value(4))
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)].availableBooths", expo.getId()).value(3))
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)].totalApplications", expo.getId()).value(3))
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)].pendingCount", expo.getId()).value(1))
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)].approvedCount", expo.getId()).value(1))
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)].rejectedCount", expo.getId()).value(1));
    }

    @Test
    @DisplayName("참가업체 토큰으로 관리자 박람회 목록을 조회하면 403")
    void 참가업체가_관리자_박람회목록_조회_403() throws Exception {
        mockMvc.perform(get("/api/admin/expos").with(exhibitor(100)))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------------
    // GET /api/admin/expos/{expoId}/booths - 공개 여부 무관 부스 배치 현황
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("관리자는 비공개(DRAFT) 박람회의 부스 배치도 조회할 수 있다")
    void 관리자는_비공개_박람회_부스도_조회() throws Exception {
        Expo expo = draftExpo("비공개 박람회");
        saveBooth(expo, "A-1");

        mockMvc.perform(get("/api/admin/expos/{id}/booths", expo.getId()).with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(1));
    }

    @Test
    @DisplayName("없는 박람회의 관리자 부스 조회는 404")
    void 없는_박람회_관리자_부스조회_404() throws Exception {
        mockMvc.perform(get("/api/admin/expos/{id}/booths", 999_999L).with(admin()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("참가업체 토큰으로 관리자 부스 배치도를 조회하면 403")
    void 참가업체가_관리자_부스조회_403() throws Exception {
        Expo expo = draftExpo("비공개 박람회2");

        mockMvc.perform(get("/api/admin/expos/{id}/booths", expo.getId()).with(exhibitor(100)))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------------
    // GET /api/admin/booth-applications - 전체 신청 그룹 목록
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("관리자는 모든 참가업체의 신청을 그룹 단위로 조회할 수 있다")
    void 관리자_전체_신청목록_조회() throws Exception {
        Expo expo = openExpo("전체 조회 박람회");
        Booth booth1 = saveBooth(expo, "A-1");
        Booth booth2 = saveBooth(expo, "A-2");

        saveSubmitted(saveGroup(expo, 100L), booth1, 100L);
        saveSubmitted(saveGroup(expo, 200L), booth2, 200L);

        mockMvc.perform(get("/api/admin/booth-applications").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2));
    }

    @Test
    @DisplayName("참가업체 토큰으로 관리자 전체 신청목록을 조회하면 403")
    void 참가업체가_관리자_전체신청목록_조회_403() throws Exception {
        mockMvc.perform(get("/api/admin/booth-applications").with(exhibitor(100)))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------------
    // 다른 박람회 부스가 섞여 신청되는 버그 회귀 테스트 (a8006f4)
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("다른 박람회 소속 부스로 신청하면 404")
    void 다른_박람회_부스로_신청하면_404() throws Exception {
        Expo expoA = openExpo("박람회 A");
        Expo expoB = openExpo("박람회 B");
        Booth boothOfB = saveBooth(expoB, "B-1");

        String body = objectMapper.writeValueAsString(Map.of(
                "expoId", expoA.getId(),
                "boothIds", List.of(boothOfB.getId()),
                "exhibitionItem", "전기차 충전기",
                "conceptDescription", "친환경 모빌리티 솔루션 전시",
                "powerRequested", true,
                "waterSupplyRequested", false,
                "internetRequested", false,
                "saveMode", "SUBMIT"));

        mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor(100))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }
}
