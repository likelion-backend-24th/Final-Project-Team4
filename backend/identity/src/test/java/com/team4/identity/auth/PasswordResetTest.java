package com.team4.identity.auth;

import com.team4.identity.auth.mail.MailSender;
import com.team4.identity.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 비밀번호 재설정 요청 -> 링크 토큰으로 새 비밀번호 설정 -> 기존 세션 무효화
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetTest {

    private static final String SIGNUP_BODY = """
            {
              "businessNo": "123-45-67890",
              "password": "password123",
              "email": "manager@corp.com",
              "companyName": "코퍼레이션",
              "managerName": "KJH",
              "contact": "010-1234-5678",
              "companyAddress": "서울시 강남구 테헤란로 1",
              "industry": "전기차 부품 제조",
              "representativeName": "이대표",
              "companyContact": "02-1234-5678"
            }
            """;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    // 실제 발송 대신 목으로 바꿔서 링크(토큰)를 캡처함
    @MockBean
    MailSender mailSender;

    @BeforeEach
    void signUp() throws Exception {
        userRepository.deleteAllInBatch();
        mockMvc.perform(post("/api/auth/exhibitors/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(SIGNUP_BODY));
    }

    // 재설정 요청 후 메일 body에서 token 값을 뽑아냄
    private String requestResetAndCaptureToken() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"manager@corp.com\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailSender, atLeastOnce()).send(eq("manager@corp.com"), any(), body.capture());

        String latest = body.getAllValues().get(body.getAllValues().size() - 1);
        Matcher m = Pattern.compile("token=(\\S+)").matcher(latest);
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    private void confirm(String token, String newPassword, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"newPassword\":\"" + newPassword + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    private void signIn(String password, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"manager@corp.com\",\"password\":\"" + password + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void 미가입_이메일로_요청해도_200이고_메일은_발송되지_않는다() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@corp.com\"}"))
                .andExpect(status().isOk());

        verifyNoInteractions(mailSender);
    }

    @Test
    void 유효한_토큰으로_재설정하면_새_비밀번호로만_로그인된다() throws Exception {
        String token = requestResetAndCaptureToken();

        confirm(token, "newpassword123", 200);

        signIn("password123", 401);
        signIn("newpassword123", 200);
    }

    @Test
    void 재설정하면_기존_refreshToken이_무효화된다() throws Exception {
        MvcResult signin = mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"manager@corp.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie refreshCookie = signin.getResponse().getCookie("refreshToken");
        assertThat(refreshCookie).isNotNull();

        confirm(requestResetAndCaptureToken(), "newpassword123", 200);

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 이미_사용한_토큰으로는_재설정할_수_없다() throws Exception {
        String token = requestResetAndCaptureToken();

        confirm(token, "newpassword123", 200);
        confirm(token, "anotherpass123", 400);
    }

    @Test
    void 재설정을_다시_요청하면_이전_링크는_무효화된다() throws Exception {
        String oldToken = requestResetAndCaptureToken();
        String newToken = requestResetAndCaptureToken();

        confirm(oldToken, "newpassword123", 400);
        confirm(newToken, "newpassword123", 200);
    }

    @Test
    void 위조된_토큰은_400() throws Exception {
        confirm("garbage-token", "newpassword123", 400);
    }
}
