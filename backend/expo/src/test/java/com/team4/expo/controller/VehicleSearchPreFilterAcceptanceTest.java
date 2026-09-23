package com.team4.expo.controller;

import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.client.VehicleSearchInterpretation;
import com.team4.expo.client.VehicleSearchInterpreter;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.repository.ExpoRepository;
import com.team4.expo.vehicle.domain.Vehicle;
import com.team4.expo.vehicle.dto.VehicleSearchCandidate;
import com.team4.expo.vehicle.repository.VehicleRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 자연어 차량 검색 - 가격·차종 조건을 Gemini 호출 전에 SQL(엔티티) 레벨에서 미리 걸러 후보 수를 줄이는지 검증(2026-09-23, 토큰 비용 절감).
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("자연어 차량 검색 - 가격/차종 사전 필터링")
class VehicleSearchPreFilterAcceptanceTest {

    @Autowired MockMvc mockMvc;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired VehicleRepository vehicleRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;

    @MockBean VehicleSearchInterpreter vehicleSearchInterpreter;

    @BeforeEach
    void clean() {
        vehicleRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    private Booth assignedBooth(String boothNo) {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10));
        expo.open();
        expoRepository.save(expo);
        Booth booth = boothRepository.save(new Booth(expo, boothNo, "조립 부스", 3_000_000));
        booth.assign();
        return boothRepository.save(booth);
    }

    private void saveVehicle(Booth booth, String name, long startPrice, String category) {
        vehicleRepository.save(new Vehicle(booth, name, "태그", startPrice, "요약", "설명", "특징", "색상",
                "400 km", "70 kWh", "300 ps", "브랜드", category, "AWD", null, null, null, null, null));
    }

    @Test
    @DisplayName("가격대+차종 조건이 있으면 조건에 맞는 차량만 Gemini 후보로 넘어간다")
    void 가격_차종_조건_사전필터링() throws Exception {
        Booth booth = assignedBooth("A-101");
        saveVehicle(booth, "저가 세단", 25_000_000L, "세단");
        saveVehicle(booth, "300만원대 SUV", 3_500_000L, "SUV");
        saveVehicle(booth, "고가 스포츠카", 90_000_000L, "스포츠카");

        when(vehicleSearchInterpreter.search(anyString(), any()))
                .thenReturn(Optional.of(new VehicleSearchInterpretation(List.of(), "요약")));

        mockMvc.perform(get("/api/customer/vehicles/search").param("query", "300만원대 SUV 추천해줘"))
                .andExpect(status().isOk());

        ArgumentCaptor<List<VehicleSearchCandidate>> captor = ArgumentCaptor.forClass(List.class);
        verify(vehicleSearchInterpreter).search(anyString(), captor.capture());

        assertThat(captor.getValue()).hasSize(1);
        assertThat(captor.getValue().get(0).getName()).isEqualTo("300만원대 SUV");
    }

    @Test
    @DisplayName("'7000만원대'는 7000만~7999만원 범위로 거른다('7천만원대' 표기도 동일)")
    void 만원대_범위는_끝자리_0개수로_결정() throws Exception {
        Booth booth = assignedBooth("A-101");
        saveVehicle(booth, "6900만원 차", 69_000_000L, "세단");
        saveVehicle(booth, "7500만원 차", 75_000_000L, "세단");
        saveVehicle(booth, "7999만원 차", 79_990_000L, "세단");
        saveVehicle(booth, "8000만원 차", 80_000_000L, "세단");

        when(vehicleSearchInterpreter.search(anyString(), any()))
                .thenReturn(Optional.of(new VehicleSearchInterpretation(List.of(), "요약")));

        for (String query : List.of("7000만원대 차 추천", "7천만원대 차 추천")) {
            org.mockito.Mockito.clearInvocations(vehicleSearchInterpreter);
            mockMvc.perform(get("/api/customer/vehicles/search").param("query", query))
                    .andExpect(status().isOk());

            ArgumentCaptor<List<VehicleSearchCandidate>> captor = ArgumentCaptor.forClass(List.class);
            verify(vehicleSearchInterpreter).search(anyString(), captor.capture());
            assertThat(captor.getValue()).extracting(VehicleSearchCandidate::getName)
                    .containsExactlyInAnyOrder("7500만원 차", "7999만원 차");
        }
    }

    @Test
    @DisplayName("차종은 자유 입력값('SUV차량')도 포함 매칭하고, 차종 미입력 차량은 제외하지 않는다")
    void 차종_포함매칭_미입력은_유지() throws Exception {
        Booth booth = assignedBooth("A-101");
        saveVehicle(booth, "자유입력 SUV", 40_000_000L, "SUV차량");
        saveVehicle(booth, "차종 미입력", 40_000_000L, null);
        saveVehicle(booth, "세단", 40_000_000L, "세단");

        when(vehicleSearchInterpreter.search(anyString(), any()))
                .thenReturn(Optional.of(new VehicleSearchInterpretation(List.of(), "요약")));

        mockMvc.perform(get("/api/customer/vehicles/search").param("query", "suv 추천해줘"))
                .andExpect(status().isOk());

        ArgumentCaptor<List<VehicleSearchCandidate>> captor = ArgumentCaptor.forClass(List.class);
        verify(vehicleSearchInterpreter).search(anyString(), captor.capture());
        assertThat(captor.getValue()).extracting(VehicleSearchCandidate::getName)
                .containsExactlyInAnyOrder("자유입력 SUV", "차종 미입력");
    }

    @Test
    @DisplayName("규칙으로 못 거르는 순수 의미론적 질의는 전체 후보가 그대로 넘어간다")
    void 의미론적_질의는_필터링_안함() throws Exception {
        Booth booth = assignedBooth("A-101");
        saveVehicle(booth, "저가 세단", 25_000_000L, "세단");
        saveVehicle(booth, "300만원대 SUV", 3_500_000L, "SUV");
        saveVehicle(booth, "고가 스포츠카", 90_000_000L, "스포츠카");

        when(vehicleSearchInterpreter.search(anyString(), any()))
                .thenReturn(Optional.of(new VehicleSearchInterpretation(List.of(), "요약")));

        mockMvc.perform(get("/api/customer/vehicles/search").param("query", "가족끼리 타기 좋은 차 추천해줘"))
                .andExpect(status().isOk());

        ArgumentCaptor<List<VehicleSearchCandidate>> captor = ArgumentCaptor.forClass(List.class);
        verify(vehicleSearchInterpreter).search(anyString(), captor.capture());

        assertThat(captor.getValue()).hasSize(3);
    }
}
