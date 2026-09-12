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
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 토큰 재발급 / 로그아웃
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RefreshLogoutTest {

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

    // 실제 발송 대신 목으로 바꿔서 가입 인증 메일의 토큰을 캡처함
    @MockBean
    MailSender mailSender;

    @BeforeEach
    void signUp() throws Exception {
        userRepository.deleteAllInBatch();
        mockMvc.perform(post("/api/auth/exhibitors/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(SIGNUP_BODY));

        verifyEmail();
    }

    private void verifyEmail() throws Exception {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailSender).send(eq("manager@corp.com"), any(), body.capture());

        Matcher m = Pattern.compile("token=(\\S+)").matcher(body.getValue());
        assertThat(m.find()).isTrue();

        mockMvc.perform(post("/api/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + m.group(1) + "\"}"));
    }

    private Cookie signInAndGetRefreshCookie() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"manager@corp.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("refreshToken");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    @Test
    void 쿠키로_재발급하면_새_accessToken과_refresh쿠키를_반환한다() throws Exception {
        Cookie refreshCookie = signInAndGetRefreshCookie();

        MvcResult reissued = mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(cookie().exists("refreshToken"))
                .andReturn();

        assertThat(reissued.getResponse().getCookie("refreshToken").getValue()).isNotBlank();
    }

    @Test
    void 쿠키가_없으면_재발급은_401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 로그아웃하면_쿠키가_만료되고_이후_재발급은_401() throws Exception {
        Cookie refreshCookie = signInAndGetRefreshCookie();

        mockMvc.perform(post("/api/auth/logout").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("refreshToken", 0));

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 쿠키가_없어도_로그아웃은_200() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk());
    }
}
