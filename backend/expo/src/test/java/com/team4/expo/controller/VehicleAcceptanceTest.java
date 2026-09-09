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
import com.team4.expo.repository.VehicleImageRepository;
import com.team4.expo.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 3 Acceptance - 부스 차량 등록·관리")
class VehicleAcceptanceTest {

    private static final long EXHIBITOR_ID = 100L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired VehicleRepository vehicleRepository;
    @Autowired VehicleImageRepository vehicleImageRepository;

    private static RequestPostProcessor exhibitor(long userId) {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(userId));
            request.addHeader("X-User-Role", "EXHIBITOR");
            return request;
        };
    }

    @BeforeEach
    void clean() {
        vehicleImageRepository.deleteAllInBatch();
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

    private Long registerVehicle(Long boothId, long exhibitorId) throws Exception {
        String created = mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", boothId)
                        .with(exhibitor(exhibitorId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).path("data").path("vehicleId").asLong();
    }

    private String vehicleBody(String name, Long startPrice) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "name", name,
                "tags", List.of("전기차", "SUV"),
                "startPrice", startPrice,
                "summary", "요약입니다",
                "description", "설명입니다",
                "range", "458 km",
                "battery", "77.4 kWh",
                "power", "325 ps"
        ));
    }

    @Test
    @DisplayName("참가 확정 업체는 담당 부스에 차량을 등록할 수 있다")
    void 참가확정_업체_차량_등록_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("아이오닉 5"))
                .andExpect(jsonPath("$.data.tags[0]").value("전기차"))
                .andExpect(jsonPath("$.data.boothId").value(booth.getId()));

        assertThat(vehicleRepository.findByBooth_IdOrderByCreatedAtAsc(booth.getId())).hasSize(1);
    }

    @Test
    @DisplayName("등록한 차량을 목록에서 조회할 수 있다")
    void 차량_목록_조회() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("아이오닉 5"));
    }

    @Test
    @DisplayName("등록한 차량을 수정할 수 있다")
    void 차량_수정_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        String created = mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andReturn().getResponse().getContentAsString();
        Long vehicleId = objectMapper.readTree(created).path("data").path("vehicleId").asLong();

        mockMvc.perform(put("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}", booth.getId(), vehicleId)
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5 (수정)", 53_000_000L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vehicleId").value(vehicleId))
                .andExpect(jsonPath("$.data.name").value("아이오닉 5 (수정)"))
                .andExpect(jsonPath("$.data.startPrice").value(53_000_000L));
    }

    @Test
    @DisplayName("등록한 차량을 삭제할 수 있다")
    void 차량_삭제_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        String created = mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andReturn().getResponse().getContentAsString();
        Long vehicleId = objectMapper.readTree(created).path("data").path("vehicleId").asLong();

        mockMvc.perform(delete("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}", booth.getId(), vehicleId)
                        .with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk());

        assertThat(vehicleRepository.findByBooth_IdOrderByCreatedAtAsc(booth.getId())).isEmpty();
    }

    @Test
    @DisplayName("참가 미확정 업체는 차량을 등록할 수 없다")
    void 참가_미확정_업체_차량_등록_차단() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveSubmittedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("다른 업체는 담당하지 않는 부스에 차량을 등록할 수 없다")
    void 타업체_부스_차량_등록_차단() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(999L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("존재하지 않는 부스에는 차량을 등록할 수 없다")
    void 존재하지_않는_부스_404() throws Exception {
        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", 999_999L)
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("아이오닉 5", 52_400_000L)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("차량명이 빈 값이면 등록이 거부된다")
    void 잘못된_입력값_400() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);

        mockMvc.perform(post("/api/exhibitor/booths/{boothId}/vehicles", booth.getId())
                        .with(exhibitor(EXHIBITOR_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("", 52_400_000L)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("등록한 차량에 이미지를 추가할 수 있다")
    void 차량_이미지_등록_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);
        Long vehicleId = registerVehicle(booth.getId(), EXHIBITOR_ID);

        MockMultipartFile file = new MockMultipartFile("image", "vehicle.png", MediaType.IMAGE_PNG_VALUE,
                new byte[]{1, 2, 3, 4});

        mockMvc.perform(multipart("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images", booth.getId(), vehicleId)
                        .file(file)
                        .with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.imageUrl").isNotEmpty());

        assertThat(vehicleImageRepository.findByVehicle_IdOrderBySortOrderAsc(vehicleId)).hasSize(1);
    }

    @Test
    @DisplayName("차량 이미지는 최대 5장까지만 등록할 수 있다")
    void 차량_이미지_최대_5장_제한() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);
        Long vehicleId = registerVehicle(booth.getId(), EXHIBITOR_ID);

        for (int i = 0; i < 5; i++) {
            MockMultipartFile file = new MockMultipartFile("image", "vehicle.png", MediaType.IMAGE_PNG_VALUE,
                    new byte[]{(byte) i});
            mockMvc.perform(multipart("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images", booth.getId(), vehicleId)
                            .file(file)
                            .with(exhibitor(EXHIBITOR_ID)))
                    .andExpect(status().isCreated());
        }

        MockMultipartFile sixth = new MockMultipartFile("image", "vehicle.png", MediaType.IMAGE_PNG_VALUE,
                new byte[]{9});
        mockMvc.perform(multipart("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images", booth.getId(), vehicleId)
                        .file(sixth)
                        .with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("등록한 차량 이미지를 삭제할 수 있다")
    void 차량_이미지_삭제_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);
        Long vehicleId = registerVehicle(booth.getId(), EXHIBITOR_ID);

        MockMultipartFile file = new MockMultipartFile("image", "vehicle.png", MediaType.IMAGE_PNG_VALUE,
                new byte[]{1, 2, 3, 4});
        String created = mockMvc.perform(multipart("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images", booth.getId(), vehicleId)
                        .file(file)
                        .with(exhibitor(EXHIBITOR_ID)))
                .andReturn().getResponse().getContentAsString();
        Long imageId = objectMapper.readTree(created).path("data").path("imageId").asLong();

        mockMvc.perform(delete("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images/{imageId}",
                        booth.getId(), vehicleId, imageId)
                        .with(exhibitor(EXHIBITOR_ID)))
                .andExpect(status().isOk());

        assertThat(vehicleImageRepository.findByVehicle_IdOrderBySortOrderAsc(vehicleId)).isEmpty();
    }

    @Test
    @DisplayName("참가 미확정 업체는 차량 이미지를 등록할 수 없다")
    void 참가_미확정_업체_차량_이미지_등록_차단() throws Exception {
        Expo expo = openExpo();
        Booth confirmedBooth = saveConfirmedBooth(expo, "A-101", EXHIBITOR_ID);
        Long vehicleId = registerVehicle(confirmedBooth.getId(), EXHIBITOR_ID);
        Booth submittedBooth = saveSubmittedBooth(expo, "A-202", 200L);

        MockMultipartFile file = new MockMultipartFile("image", "vehicle.png", MediaType.IMAGE_PNG_VALUE,
                new byte[]{1, 2, 3, 4});

        mockMvc.perform(multipart("/api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images", submittedBooth.getId(), vehicleId)
                        .file(file)
                        .with(exhibitor(200L)))
                .andExpect(status().isForbidden());
    }
}
