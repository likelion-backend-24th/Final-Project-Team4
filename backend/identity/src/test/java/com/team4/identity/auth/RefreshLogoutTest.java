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
import org.springframework.data.redis.core.StringRedisTemplate;
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

    @Autowired
    StringRedisTemplate redis;

    // 실제 발송 대신 목으로 바꿔서 인증 코드를 캡처함
    @MockBean
    MailSender mailSender;

    @BeforeEach
    void signUp() throws Exception {
        userRepository.deleteAllInBatch();
        verifyEmail("manager@corp.com");
        mockMvc.perform(post("/api/auth/exhibitors/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(SIGNUP_BODY));
    }

    private void verifyEmail(String email) throws Exception {
        mockMvc.perform(post("/api/auth/email-verification/code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailSender).send(eq(email), any(), body.capture());
        Matcher m = Pattern.compile("(\\d{6})\\s*$").matcher(body.getValue());
        assertThat(m.find()).isTrue();

        mockMvc.perform(post("/api/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"code\":\"" + m.group(1) + "\"}"))
                .andExpect(status().isOk());
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
    void 회전된_토큰을_유예시간_안에_다시_쓰면_401이고_새_세션은_유지된다() throws Exception {
        Cookie oldCookie = signInAndGetRefreshCookie();
        Cookie newCookie = mockMvc.perform(post("/api/auth/refresh").cookie(oldCookie))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("refreshToken");

        // 여러 탭 동시 재발급 상황: 옛 토큰은 거절되지만 세션은 끊지 않음
        mockMvc.perform(post("/api/auth/refresh").cookie(oldCookie))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh").cookie(newCookie))
                .andExpect(status().isOk());
    }

    @Test
    void 회전된_토큰을_유예시간_이후_다시_쓰면_새_토큰까지_무효화된다() throws Exception {
        Cookie oldCookie = signInAndGetRefreshCookie();
        Cookie newCookie = mockMvc.perform(post("/api/auth/refresh").cookie(oldCookie))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("refreshToken");

        // 유예시간이 지난 것처럼 회전 시각을 0으로 되돌림
        redis.keys("used:refresh:*").forEach(key -> redis.opsForValue().set(key, "0"));

        mockMvc.perform(post("/api/auth/refresh").cookie(oldCookie))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh").cookie(newCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 쿠키가_없어도_로그아웃은_200() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk());
    }
}
