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
import com.team4.expo.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 3 Acceptance - 부스 콘텐츠·배너 이미지 관리")
class BoothContentAcceptanceTest {

    private static final long EXHIBITOR_ID = 100L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired PostRepository postRepository;

    private static RequestPostProcessor exhibitor(long userId) {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(userId));
            request.addHeader("X-User-Role", "EXHIBITOR");
            return request;
        };
    }

    @BeforeEach
    void clean() {
        postRepository.deleteAllInBatch();
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

    private Booth saveBooth(Expo expo, String boothNo) {
        return boothRepository.save(new Booth(expo, boothNo, "조립 부스", 3_000_000));
    }

    private Booth saveConfirmedBooth(Expo expo, String boothNo, long exhibitorId) {
        Booth booth = saveBooth(expo, boothNo);
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시",
                true, false, false, null));
        boothApplicationRepository.save(
                new BoothApplication(booth, group, exhibitorId, ApplicationStatus.CONFIRMED));
        booth.assign();
        return booth;
    }

    private Booth saveSubmittedBooth(Expo expo, String boothNo, long exhibitorId) {
        Booth booth = saveBooth(expo, boothNo);
        BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시",
                true, false, false, null));
        boothApplicationRepository.save(
                new BoothApplication(booth, group, exhibitorId, ApplicationStatus.SUBMITTED));
        return booth;
    }

    private String contentBody(String title, String content) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of("title", title, "content", content));
    }

    private String uploadBanner(Long boothId, byte[] bytes) throws Exception {
        MockMultipartFile file = new MockMultipartFile("image", "banner.png", MediaType.IMAGE_PNG_VALUE, bytes);
        String response = mockMvc.perform(multipart(HttpMethod.PUT, "/api/exhibitor/booths/{boothId}/banner-image", boothId)
                        .file(file)
                        .with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).path("data").path("bannerImageUrl").asText();
    }

    @Test
    @DisplayName("참가 확정 업체는 담당 부스 콘텐츠를 등록할 수 있다")
    void 참가확정_업체_콘텐츠_등록_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/content", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(contentBody("전기차 충전 솔루션", "최신 급속 충전 기술을 소개합니다.")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("전기차 충전 솔루션"))
                .andExpect(jsonPath("$.data.boothId").value(booth.getId()));

        assertThat(postRepository.findByBooth_Id(booth.getId())).isPresent();
    }

    @Test
    @DisplayName("콘텐츠를 다시 등록하면 새로 만들지 않고 기존 글을 수정한다")
    void 콘텐츠_재등록시_업서트() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        String firstResponse = mockMvc.perform(put("/api/exhibitor/booths/{boothId}/content", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(contentBody("첫 제목", "첫 내용")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long firstPostId = objectMapper.readTree(firstResponse).path("data").path("postId").asLong();

        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/content", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(contentBody("수정된 제목", "수정된 내용")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.postId").value(firstPostId))
                .andExpect(jsonPath("$.data.title").value("수정된 제목"));

        assertThat(postRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("참가 확정 업체는 배너 이미지를 등록할 수 있다")
    void 배너이미지_등록_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        String bannerImageUrl = uploadBanner(booth.getId(), new byte[]{1, 2, 3, 4});

        assertThat(bannerImageUrl).isNotBlank();
        assertThat(boothRepository.findById(booth.getId()).orElseThrow().getBannerImageUrl())
                .isEqualTo(bannerImageUrl);
    }

    @Test
    @DisplayName("배너 이미지를 다시 등록하면 기존 URL이 새 URL로 교체된다")
    void 배너이미지_재등록시_교체() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        String firstUrl = uploadBanner(booth.getId(), new byte[]{1, 2, 3, 4});
        String secondUrl = uploadBanner(booth.getId(), new byte[]{5, 6, 7, 8});

        assertThat(secondUrl).isNotEqualTo(firstUrl);
        assertThat(boothRepository.findById(booth.getId()).orElseThrow().getBannerImageUrl())
                .isEqualTo(secondUrl);
    }

    @Test
    @DisplayName("참가 미확정 업체는 콘텐츠를 등록할 수 없다")
    void 참가_미확정_업체_콘텐츠_등록_차단() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveSubmittedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/content", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(contentBody("전기차 충전 솔루션", "최신 급속 충전 기술을 소개합니다.")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("다른 업체는 담당하지 않는 부스의 콘텐츠를 수정할 수 없다")
    void 타업체_부스_콘텐츠_수정_차단() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/content", booth.getId())
                        .with(exhibitor(999L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(contentBody("전기차 충전 솔루션", "최신 급속 충전 기술을 소개합니다.")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("존재하지 않는 부스에는 콘텐츠를 등록할 수 없다")
    void 존재하지_않는_부스_404() throws Exception {
        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/content", 999_999L)
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(contentBody("전기차 충전 솔루션", "최신 급속 충전 기술을 소개합니다.")))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("제목이 빈 값이면 콘텐츠 등록이 거부된다")
    void 잘못된_입력값_400() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/content", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(contentBody("", "내용은 있음")))
                .andExpect(status().isBadRequest());
    }


}
