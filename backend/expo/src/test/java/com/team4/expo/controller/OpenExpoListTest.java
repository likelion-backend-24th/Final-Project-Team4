package com.team4.expo.controller;

import com.team4.expo.domain.Expo;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// TASK 1-3 - 공개 박람회 목록 조회 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenExpoListTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ExpoRepository expoRepository;
    @Autowired
    BoothRepository boothRepository;

    // 게이트웨이가 주입하는 신원 헤더 흉내
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
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    private Expo saveExpo(String title, boolean open) {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo(title, "COEX", now.plusDays(30), now.plusDays(33),
                now.minusDays(5), now.plusDays(10));
        if (open) {
            expo.open();
        }
        return expoRepository.save(expo);
    }

    @Test
    void OPEN_박람회만_반환하고_DRAFT는_제외한다() throws Exception {
        saveExpo("서울 모빌리티 엑스포", true);
        saveExpo("부산 국제 모터쇼", true);
        saveExpo("비공개 준비중 박람회", false);

        mockMvc.perform(get("/api/exhibitor/expos").with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content[0].venue").value("COEX"))
                .andExpect(jsonPath("$.data.content[0].applyStartsAt").isNotEmpty());
    }

    @Test
    void 페이징() throws Exception {
        for (int i = 0; i < 15; i++) {
            saveExpo("박람회 " + i, true);
        }

        mockMvc.perform(get("/api/exhibitor/expos")
                        .param("page", "0").param("size", "10")
                        .with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(10))
                .andExpect(jsonPath("$.data.totalElements").value(15))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.last").value(false));
    }

    @Test
    void EXHIBITOR가_아니면_403() throws Exception {
        mockMvc.perform(get("/api/exhibitor/expos").with(role("ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    void 인증_정보가_없으면_401() throws Exception {
        mockMvc.perform(get("/api/exhibitor/expos"))
                .andExpect(status().isUnauthorized());
    }
}