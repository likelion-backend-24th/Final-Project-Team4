package com.team4.expo.controller;

import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.Post;
import com.team4.expo.domain.Vehicle;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import com.team4.expo.repository.PostRepository;
import com.team4.expo.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 3 Acceptance - 고객용 부스별 전시 차량 조회")
class ExpoCustomerVehicleAcceptanceTest {

    @Autowired MockMvc mockMvc;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired PostRepository postRepository;
    @Autowired VehicleRepository vehicleRepository;

    @BeforeEach
    void clean() {
        vehicleRepository.deleteAllInBatch();
        postRepository.deleteAllInBatch();
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

    private Booth assignedBooth(Expo expo, String boothNo) {
        Booth booth = boothRepository.save(new Booth(expo, boothNo, "조립 부스", 3_000_000));
        booth.assign();
        return booth;
    }

    private Vehicle saveVehicle(Booth booth, String name) {
        return vehicleRepository.save(new Vehicle(booth, name, "전기차,SUV", 50_000_000L,
                "요약", "설명", "주요 특징", "레드,블랙", "400 km", "70 kWh", "300 ps"));
    }

    @Test
    @DisplayName("참가 확정 부스의 차량 목록을 비회원도 조회할 수 있다")
    void 비회원_차량_조회_성공() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, "A-101");
        postRepository.save(new Post(booth, "전기차 충전 솔루션", "부스 소개 내용"));
        saveVehicle(booth, "아이오닉 5");

        mockMvc.perform(get("/api/customer/expos/{expoId}/vehicles", expo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].boothNo").value("A-101"))
                .andExpect(jsonPath("$.data[0].title").value("전기차 충전 솔루션"))
                .andExpect(jsonPath("$.data[0].vehicles.length()").value(1))
                .andExpect(jsonPath("$.data[0].vehicles[0].name").value("아이오닉 5"));
    }

    @Test
    @DisplayName("부스 소개가 없으면 제목을 부스 번호로 대체한다")
    void 부스소개_없으면_부스번호로_대체() throws Exception {
        Expo expo = openExpo();
        Booth booth = assignedBooth(expo, "A-101");
        saveVehicle(booth, "아이오닉 5");

        mockMvc.perform(get("/api/customer/expos/{expoId}/vehicles", expo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("A-101 부스"));
    }

    @Test
    @DisplayName("등록된 차량이 없는 부스는 목록에서 제외된다")
    void 차량없는_부스_제외() throws Exception {
        Expo expo = openExpo();
        assignedBooth(expo, "A-101");

        mockMvc.perform(get("/api/customer/expos/{expoId}/vehicles", expo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("참가 확정되지 않은 부스는 목록에서 제외된다")
    void 미확정_부스_제외() throws Exception {
        Expo expo = openExpo();
        Booth booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
        saveVehicle(booth, "아이오닉 5");

        mockMvc.perform(get("/api/customer/expos/{expoId}/vehicles", expo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("존재하지 않는 박람회는 404를 반환한다")
    void 존재하지_않는_박람회_404() throws Exception {
        mockMvc.perform(get("/api/customer/expos/{expoId}/vehicles", 999_999L))
                .andExpect(status().isNotFound());
    }
}
