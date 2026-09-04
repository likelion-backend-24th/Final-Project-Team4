package com.team4.expo.controller;

import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// TASK 1-3 - 박람회 부스 목록 조회 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExpoBoothsTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ExpoRepository expoRepository;
    @Autowired
    BoothRepository boothRepository;
    @Autowired
    BoothApplicationRepository boothApplicationRepository;
    @Autowired
    BoothApplicationGroupRepository boothApplicationGroupRepository;

    private static RequestPostProcessor exhibitor() {
        return role("EXHIBITOR");
    }

    private static RequestPostProcessor role(String role) {
        return request -> {
            request.addHeader("X-User-Id", "1");
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

    private Expo saveExpo(boolean open, LocalDateTime applyStartsAt, LocalDateTime applyEndsAt) {
        LocalDateTime base = LocalDateTime.now();
        Expo expo = new Expo("서울 모빌리티 엑스포", "COEX", base.plusDays(40), base.plusDays(43),
                applyStartsAt, applyEndsAt);
        if (open) {
            expo.open();
        }
        return expoRepository.save(expo);
    }

    private void saveBooth(Expo expo, String boothNo, BoothStatus status) {
        Booth booth = new Booth(expo, boothNo, "조립 부스 (3m x 3m)", 3_500_000);
        if (status == BoothStatus.ASSIGNED) {
            ReflectionTestUtils.setField(booth, "status", BoothStatus.ASSIGNED);
        }
        boothRepository.save(booth);
    }

    @Test
    void 부스_목록과_유형_참가비_applicable을_반환한다() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = saveExpo(true, now.minusDays(3), now.plusDays(7));
        saveBooth(expo, "A-101", BoothStatus.AVAILABLE);
        saveBooth(expo, "A-102", BoothStatus.AVAILABLE);
        saveBooth(expo, "A-103", BoothStatus.ASSIGNED);

        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expo.getId()).with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.expoId").value(expo.getId()))
                .andExpect(jsonPath("$.data.totalCount").value(3))
                .andExpect(jsonPath("$.data.availableCount").value(2))
                .andExpect(jsonPath("$.data.booths.length()").value(3))
                .andExpect(jsonPath("$.data.booths[0].boothNo").value("A-101"))
                .andExpect(jsonPath("$.data.booths[0].type").value("조립 부스 (3m x 3m)"))
                .andExpect(jsonPath("$.data.booths[0].fee").value(3500000))
                .andExpect(jsonPath("$.data.booths[0].applicable").value(true))
                .andExpect(jsonPath("$.data.booths[2].status").value("ASSIGNED"))
                .andExpect(jsonPath("$.data.booths[2].applicable").value(false));
    }

    @Test
    void 신청_기간이_지나면_모든_부스가_applicable_false지만_목록에는_노출된다() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = saveExpo(true, now.minusDays(30), now.minusDays(1));
        saveBooth(expo, "A-101", BoothStatus.AVAILABLE);

        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expo.getId()).with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.booths.length()").value(1))
                .andExpect(jsonPath("$.data.booths[0].applicable").value(false));
    }

    @Test
    void status_필터로_AVAILABLE만_조회해도_집계는_전체_기준이다() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = saveExpo(true, now.minusDays(3), now.plusDays(7));
        saveBooth(expo, "A-101", BoothStatus.AVAILABLE);
        saveBooth(expo, "A-102", BoothStatus.ASSIGNED);

        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expo.getId())
                        .param("status", "AVAILABLE")
                        .with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.booths.length()").value(1))
                .andExpect(jsonPath("$.data.booths[0].status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.totalCount").value(2))
                .andExpect(jsonPath("$.data.availableCount").value(1));
    }

    @Test
    void DRAFT_박람회는_404() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Expo draft = saveExpo(false, now.minusDays(3), now.plusDays(7));

        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", draft.getId()).with(exhibitor()))
                .andExpect(status().isNotFound());
    }

    @Test
    void 없는_박람회는_404() throws Exception {
        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", 999999).with(exhibitor()))
                .andExpect(status().isNotFound());
    }

    @Test
    void status_값이_이상하면_400() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = saveExpo(true, now.minusDays(3), now.plusDays(7));

        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expo.getId())
                        .param("status", "WEIRD")
                        .with(exhibitor()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void EXHIBITOR가_아니면_403() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = saveExpo(true, now.minusDays(3), now.plusDays(7));

        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expo.getId()).with(role("ADMIN")))
                .andExpect(status().isForbidden());
    }
}