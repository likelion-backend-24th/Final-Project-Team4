package com.team4.expo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.domain.Booth;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 1 Acceptance Test: 박람회 공개 -> 부스 참가 신청.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 1 Acceptance - 박람회 공개부터 부스 참가 신청까지")
class BoothApplicationAcceptanceTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;

    private static RequestPostProcessor admin() {
        return headers("1", "ADMIN");
    }

    private static RequestPostProcessor exhibitor(String userId) {
        return headers(userId, "EXHIBITOR");
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

    // 신청 기간이 열려 있는 정상 박람회 등록 요청 본문
    private String registerBody(String title) {
        LocalDateTime now = LocalDateTime.now();
        return body(Map.of(
                "title", title,
                "venue", "COEX Hall A",
                "applyStartsAt", now.minusDays(1).toString(),
                "applyEndsAt", now.plusDays(10).toString(),
                "startsAt", now.plusDays(30).toString(),
                "endsAt", now.plusDays(33).toString(),
                "booths", List.of(
                        Map.of("boothNo", "A-101", "type", "조립 부스", "fee", 3_000_000),
                        Map.of("boothNo", "A-102", "type", "독립 부스", "fee", 5_000_000))));
    }

    private String body(Map<String, ?> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // 박람회 등록 -> expoId 반환
    private long registerExpo(String title) throws Exception {
        String json = mockMvc.perform(post("/api/admin/expos").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content(registerBody(title)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).path("data").path("expoId").asLong();
    }

    private void openExpo(long expoId) throws Exception {
        mockMvc.perform(post("/api/admin/expos/{id}/open", expoId).with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OPEN"));
    }

    // 박람회의 첫 번째 부스 id 조회
    private long firstBoothId(long expoId) throws Exception {
        String json = mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expoId).with(exhibitor("100")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).path("data").path("booths").get(0).path("boothId").asLong();
    }

    private String applyBody(long expoId, List<Long> boothIds, String saveMode) {
        return body(Map.of(
                "expoId", expoId,
                "boothIds", boothIds,
                "exhibitionItem", "전기차 충전기",
                "conceptDescription", "친환경 모빌리티 솔루션 전시",
                "powerRequested", true,
                "waterSupplyRequested", false,
                "internetRequested", false,
                "saveMode", saveMode));
    }

    // ---------------------------------------------------------------------
    // 정상 흐름
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("관리자가 박람회를 등록·공개하면 참가업체 목록에 노출되고, 공개 전에는 노출되지 않는다")
    void 등록_공개_노출() throws Exception {
        long expoId = registerExpo("2026 서울 모빌리티 엑스포");

        // 공개 전: 참가업체 목록에 없음
        mockMvc.perform(get("/api/exhibitor/expos").with(exhibitor("100")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)]", expoId).doesNotExist());

        openExpo(expoId);

        // 공개 후: 목록에 노출 + 부스 조회 가능
        mockMvc.perform(get("/api/exhibitor/expos").with(exhibitor("100")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.expoId == %d)]", expoId).exists());

        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expoId).with(exhibitor("100")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(2))
                .andExpect(jsonPath("$.data.booths[0].applicable").value(true));
    }

    @Test
    @DisplayName("공개 박람회의 신청 가능한 부스에 참가 신청하면 SUBMITTED로 접수된다")
    void 정상_참가신청() throws Exception {
        long expoId = registerExpo("정상 신청 박람회");
        openExpo(expoId);
        long boothId = firstBoothId(expoId);

        mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(expoId, List.of(boothId), "SUBMIT")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.groupId").isNotEmpty())
                .andExpect(jsonPath("$.data.applications[0].status").value("SUBMITTED"));
    }

    @Test
    @DisplayName("임시저장 후 이어서 최종 제출하면 SUBMITTED가 된다")
    void 임시저장_후_제출() throws Exception {
        long expoId = registerExpo("임시저장 박람회");
        openExpo(expoId);
        long boothId = firstBoothId(expoId);

        String json = mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(expoId, List.of(boothId), "DRAFT")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.applications[0].status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();
        String groupId = objectMapper.readTree(json).path("data").path("groupId").asText();

        mockMvc.perform(post("/api/exhibitor/booth-applications/groups/{groupId}/submit", groupId).with(exhibitor("100")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applications[0].status").value("SUBMITTED"));
    }

    // ---------------------------------------------------------------------
    // 실패 흐름
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("박람회 등록 시 일자 순서가 틀리면 400")
    void 일자_순서_위반_400() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        String bad = body(Map.of(
                "title", "잘못된 일자",
                "venue", "COEX",
                "applyStartsAt", now.plusDays(10).toString(),
                "applyEndsAt", now.plusDays(1).toString(),   // 시작 > 마감
                "startsAt", now.plusDays(30).toString(),
                "endsAt", now.plusDays(33).toString(),
                "booths", List.of(Map.of("boothNo", "A-1", "type", "조립", "fee", 1_000_000))));

        mockMvc.perform(post("/api/admin/expos").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("공개되지 않은 DRAFT 박람회는 부스 조회 404, 참가 신청 409")
    void 비공개_박람회_조회_404_신청_409() throws Exception {
        long expoId = registerExpo("비공개 박람회");

        // 비공개 박람회는 참가업체 부스 조회에 노출되지 않음
        mockMvc.perform(get("/api/exhibitor/expos/{id}/booths", expoId).with(exhibitor("100")))
                .andExpect(status().isNotFound());

        // 부스 id는 내부에서 확보해 신청만 시도 -> 공개되지 않아 차단
        long boothId = boothRepository.findAll().stream()
                .filter(b -> b.getExpo().getId().equals(expoId))
                .findFirst().orElseThrow().getId();

        mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(expoId, List.of(boothId), "SUBMIT")))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("신청 기간이 아니면 참가 신청 409")
    void 신청_기간_외_409() throws Exception {
        // 신청 기간이 이미 종료된 박람회를 등록 -> 공개
        LocalDateTime now = LocalDateTime.now();
        String closed = body(Map.of(
                "title", "신청 마감 박람회",
                "venue", "COEX",
                "applyStartsAt", now.minusDays(20).toString(),
                "applyEndsAt", now.minusDays(1).toString(),
                "startsAt", now.plusDays(30).toString(),
                "endsAt", now.plusDays(33).toString(),
                "booths", List.of(Map.of("boothNo", "A-1", "type", "조립", "fee", 1_000_000))));
        String json = mockMvc.perform(post("/api/admin/expos").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content(closed))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long expoId = objectMapper.readTree(json).path("data").path("expoId").asLong();
        openExpo(expoId);
        long boothId = firstBoothId(expoId);

        mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(expoId, List.of(boothId), "SUBMIT")))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("이미 배정(RESERVED)된 부스에 참가 신청하면 409")
    void 배정된_부스_신청_409() throws Exception {
        long expoId = registerExpo("배정 충돌 박람회");
        openExpo(expoId);
        long boothId = firstBoothId(expoId);

        Booth booth = boothRepository.findById(boothId).orElseThrow();
        booth.reserve();
        boothRepository.saveAndFlush(booth);

        mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(expoId, List.of(boothId), "SUBMIT")))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("같은 부스에 본인이 중복 신청하면 409")
    void 본인_중복_신청_409() throws Exception {
        long expoId = registerExpo("중복 신청 박람회");
        openExpo(expoId);
        long boothId = firstBoothId(expoId);

        mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(expoId, List.of(boothId), "SUBMIT")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/exhibitor/booth-applications").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(applyBody(expoId, List.of(boothId), "SUBMIT")))
                .andExpect(status().isConflict());
    }

    // ---------------------------------------------------------------------
    // 권한 경계 (Service Spring Security / Gateway 인증)
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("EXHIBITOR 토큰으로 관리자 박람회 등록을 시도하면 403")
    void 참가업체가_관리자API_호출_403() throws Exception {
        mockMvc.perform(post("/api/admin/expos").with(exhibitor("100"))
                        .contentType(MediaType.APPLICATION_JSON).content(registerBody("권한 없음")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("인증 정보(X-User-* 헤더)가 없으면 401")
    void 인증_없음_401() throws Exception {
        mockMvc.perform(get("/api/exhibitor/expos"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/admin/expos")
                        .contentType(MediaType.APPLICATION_JSON).content(registerBody("no auth")))
                .andExpect(status().isUnauthorized());
    }
}
