package com.team4.expo.controller;

import com.team4.expo.domain.Booth;
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
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// TASk 1-4 비회원 공개 박람회 조회 (목록, 단건) 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicExpoQueryTest {

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

    @BeforeEach
    void clean() {
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    // 신청 기간 내 && 행사 시작 전 -> phase = 모집중
    private Expo saveExpo(String title, boolean open) {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo(title, "COEX", now.plusDays(30), now.plusDays(33),
                now.minusDays(5), now.plusDays(10));
        if (open) {
            expo.open();
        }
        return expoRepository.save(expo);
    }

    private Booth saveBooth(Expo expo, String boothNo, boolean assigned) {
        Booth booth = new Booth(expo, boothNo, "표준", 100_000);
        if (assigned) {
            booth.assign();
        }
        return boothRepository.save(booth);
    }

    @Test
    void 토큰_없이_목록은_OPEN만_반환하고_phase와_참여부스수를_포함한다() throws Exception {
        Expo open = saveExpo("서울 모빌리티쇼", true);
        saveBooth(open, "A-1", true);
        saveBooth(open, "A-2", true);
        saveBooth(open, "A-3", false); // AVAILABLE - 참여부스 수에서 제외
        saveExpo("비공개 준비중", false);

        mockMvc.perform(get("/api/expos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].title").value("서울 모빌리티쇼"))
                .andExpect(jsonPath("$.data.content[0].phase").value("모집중"))
                .andExpect(jsonPath("$.data.content[0].boothCount").value(2));
    }

    @Test
    void 단건_조회는_OPEN이면_200() throws Exception {
        Expo open = saveExpo("서울 모빌리티쇼", true);

        mockMvc.perform(get("/api/expos/" + open.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.venue").value("COEX"))
                .andExpect(jsonPath("$.data.phase").value("모집중"));
    }

    @Test
    void 비공개_박람회_단건은_404() throws Exception {
        Expo draft = saveExpo("비공개", false);

        mockMvc.perform(get("/api/expos/" + draft.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void 없는_박람회는_404() throws Exception {
        mockMvc.perform(get("/api/expos/99999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void 부스_목록은_ASSIGNED만_배너와_함께_반환한다() throws Exception {
        Expo open = saveExpo("서울 모빌리티쇼", true);
        Booth assigned = saveBooth(open, "A-1", true);
        assigned.updateBannerImage("/uploads/banner/x.png");
        boothRepository.save(assigned);
        saveBooth(open, "A-2", false); // AVAILABLE - 제외

        mockMvc.perform(get("/api/expos/" + open.getId() + "/booths"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.booths.length()").value(1))
                .andExpect(jsonPath("$.data.booths[0].status").value("ASSIGNED"))
                .andExpect(jsonPath("$.data.booths[0].bannerImageUrl").value("/uploads/banner/x.png"));
    }
}
