package com.team4.expo.acceptance;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Expo;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

// Story 4 비회원 공개 열람 인수 테스트
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PublicBrowseAcceptanceTest {

    @Autowired
    TestRestTemplate http;
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

    @Test
    void 비회원이_토큰_없이_공개_박람회와_확정부스를_조회한다() {
        Expo open = saveOpenExpo("서울 모빌리티쇼");
        Booth assigned = saveBooth(open, "A-1", true);
        assigned.updateBannerImage("/uploads/banner/x.png");
        boothRepository.save(assigned);
        saveBooth(open, "A-2", false);              // AVAILABLE - 노출 제외
        Expo draft = saveDraftExpo("비공개 준비중");   // OPEN 아님 - 목록, 단건에서 제외

        // 1) 목록: OPEN 만, phase 와 확정 부스 수 포함
        ResponseEntity<String> list = http.getForEntity("/api/expos", String.class);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        DocumentContext listJson = JsonPath.parse(list.getBody());
        assertThat(listJson.read("$.data.content.length()", Integer.class)).isEqualTo(1);
        assertThat(listJson.read("$.data.content[0].title", String.class)).isEqualTo("서울 모빌리티쇼");
        assertThat(listJson.read("$.data.content[0].phase", String.class)).isEqualTo("모집중");
        assertThat(listJson.read("$.data.content[0].boothCount", Long.class)).isEqualTo(1L);

        // 2) 단건: OPEN 이면 홈 정보 200
        ResponseEntity<String> single = http.getForEntity("/api/expos/" + open.getId(), String.class);
        assertThat(single.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(JsonPath.parse(single.getBody()).read("$.data.venue", String.class)).isEqualTo("COEX");
        assertThat(JsonPath.parse(single.getBody()).read("$.data.phase", String.class)).isEqualTo("모집중");

        // 3) 부스: ASSIGNED 상태인 부스, 배너와 함께
        ResponseEntity<String> booths = http.getForEntity("/api/expos/" + open.getId() + "/booths", String.class);
        assertThat(booths.getStatusCode()).isEqualTo(HttpStatus.OK);
        DocumentContext boothsJson = JsonPath.parse(booths.getBody());
        assertThat(boothsJson.read("$.data.booths.length()", Integer.class)).isEqualTo(1);
        assertThat(boothsJson.read("$.data.booths[0].status", String.class)).isEqualTo("ASSIGNED");
        assertThat(boothsJson.read("$.data.booths[0].bannerImageUrl", String.class)).isEqualTo("/uploads/banner/x.png");

        // 4) 비공개, 없는 박람회 단건은 404
        assertThat(http.getForEntity("/api/expos/" + draft.getId(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(http.getForEntity("/api/expos/99999", String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    private Expo saveOpenExpo(String title) {
        Expo expo = newExpo(title);
        expo.open();
        return expoRepository.save(expo);
    }

    private Expo saveDraftExpo(String title) {
        return expoRepository.save(newExpo(title));
    }

    // 신청 기간 내 && 행사 시작 전 -> phase = 모집중
    private Expo newExpo(String title) {
        LocalDateTime now = LocalDateTime.now();
        return new Expo(title, "COEX", now.plusDays(30), now.plusDays(33),
                now.minusDays(5), now.plusDays(10));
    }

    private Booth saveBooth(Expo expo, String boothNo, boolean assigned) {
        Booth booth = new Booth(expo, boothNo, "표준", 100_000);
        if (assigned) {
            booth.assign();
        }
        return boothRepository.save(booth);
    }
}
