package com.team4.expo.controller;

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
import com.team4.expo.lead.repository.LeadRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 참가업체가 QR 리드 화면에서 고를 본인 부스 목록 조회(2026-09-15, DEFAULT_BOOTH_ID 하드코딩 대체).
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Acceptance - 참가업체 본인 부스 목록 조회 (QR 리드 화면용)")
class MyBoothsAcceptanceTest {

    private static final long EXHIBITOR_ID = 500L;
    private static final long OTHER_EXHIBITOR_ID = 501L;

    @Autowired MockMvc mockMvc;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired LeadRepository leadRepository;
    @Autowired ConsultationRepository consultationRepository;

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
    }

    private Booth confirmedBooth(Expo expo, long exhibitorId, String boothNo) {
        Booth booth = boothRepository.save(new Booth(expo, boothNo, "조립 부스", 3_000_000));
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시", true, false, false, null));
        boothApplicationRepository.save(new BoothApplication(booth, group, exhibitorId, ApplicationStatus.CONFIRMED));
        booth.assign();
        return boothRepository.saveAndFlush(booth);
    }

    @Test
    @DisplayName("참가 확정된 본인 부스만 조회되고, 미확정/타 업체 부스는 안 나온다")
    void 본인_확정부스만_조회() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = expoRepository.save(new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10)));
        expo.open();

        Booth mine = confirmedBooth(expo, EXHIBITOR_ID, "A-101");
        confirmedBooth(expo, OTHER_EXHIBITOR_ID, "A-102"); // 타 업체 확정 부스 - 안 보여야 함
        boothRepository.save(new Booth(expo, "A-103", "조립 부스", 3_000_000)); // 미신청 부스(AVAILABLE) - 안 보여야 함

        mockMvc.perform(get("/api/exhibitor/booths/mine").with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].boothId").value(mine.getId()))
                .andExpect(jsonPath("$.data[0].boothNo").value("A-101"))
                .andExpect(jsonPath("$.data[0].expoTitle").value("2026 모빌리티 엑스포"));
    }

    @Test
    @DisplayName("참가 확정된 부스가 없으면 빈 목록을 반환한다")
    void 확정부스_없으면_빈목록() throws Exception {
        mockMvc.perform(get("/api/exhibitor/booths/mine").with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }
}
