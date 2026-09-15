package com.team4.identity.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.identity.auth.mail.MailSender;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 11(#173) / TASK 11-4 Acceptance Test: Expo -> Identity 내부 메일 발송 API.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 11 Acceptance - Identity 내부 메일 발송 API")
class InternalMailApiTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Value("${service.token.expo}")
    private String expoServiceToken;

    @MockBean MailSender mailSender;

    private String body() {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "to", "hong@example.com", "subject", "방문 상담 안내", "body", "본문 내용"));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("정상 요청이면 MailSender로 발송하고 200을 반환한다")
    void 정상_발송() throws Exception {
        mockMvc.perform(post("/internal/identity/mails")
                        .header("Authorization", "Bearer " + expoServiceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body()))
                .andExpect(status().isOk());

        verify(mailSender).send("hong@example.com", "방문 상담 안내", "본문 내용");
    }

    @Test
    @DisplayName("MailSender 발송이 실패하면 500을 반환한다")
    void 발송실패_500() throws Exception {
        doThrow(new RuntimeException("smtp down")).when(mailSender).send(anyString(), anyString(), anyString());

        mockMvc.perform(post("/internal/identity/mails")
                        .header("Authorization", "Bearer " + expoServiceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body()))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("SVC_TOKEN 없거나 틀리면 401")
    void 인증실패_401() throws Exception {
        mockMvc.perform(post("/internal/identity/mails")
                        .header("Authorization", "Bearer wrong-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("필수값(to)이 없으면 400")
    void 필수값_누락_400() throws Exception {
        String missing = objectMapper.writeValueAsString(Map.of("subject", "s", "body", "b"));

        mockMvc.perform(post("/internal/identity/mails")
                        .header("Authorization", "Bearer " + expoServiceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(missing))
                .andExpect(status().isBadRequest());
    }
}
