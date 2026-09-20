package com.team4.expo.controller;

import com.team4.expo.client.AiSummaryClient;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 후기 문장 AI 다듬기(2026-09-20).
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("후기 문장 AI 다듬기")
class ReviewPolishAcceptanceTest {

    @Autowired MockMvc mockMvc;

    @MockBean AiSummaryClient aiSummaryClient;

    private static RequestPostProcessor customer() {
        return request -> {
            request.addHeader("X-User-Id", "9001");
            request.addHeader("X-User-Role", "USER");
            return request;
        };
    }

    private String body(String content) {
        return "{\"reviewType\":\"CONSULT\",\"vehicleName\":\"EV6\",\"content\":\"" + content + "\"}";
    }

    @Test
    @DisplayName("다듬은 문장을 돌려준다")
    void 정상_다듬기() throws Exception {
        when(aiSummaryClient.polishReview(eq("CONSULT"), eq("EV6"), eq("상담 조았어요")))
                .thenReturn(Optional.of("상담이 좋았어요."));

        mockMvc.perform(post("/api/customer/consultations/review-polish").with(customer())
                        .contentType(MediaType.APPLICATION_JSON).content(body("상담 조았어요")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draft").value("상담이 좋았어요."));
    }

    @Test
    @DisplayName("AI 호출이 실패하면 draft=null로 200(fail-open)")
    void AI실패_null() throws Exception {
        when(aiSummaryClient.polishReview(any(), any(), any())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/customer/consultations/review-polish").with(customer())
                        .contentType(MediaType.APPLICATION_JSON).content(body("내용")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.draft").doesNotExist());
    }

    @Test
    @DisplayName("빈 내용이면 400, 비로그인은 401")
    void 검증() throws Exception {
        mockMvc.perform(post("/api/customer/consultations/review-polish").with(customer())
                        .contentType(MediaType.APPLICATION_JSON).content(body("")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/customer/consultations/review-polish")
                        .contentType(MediaType.APPLICATION_JSON).content(body("내용")))
                .andExpect(status().isUnauthorized());
    }
}
