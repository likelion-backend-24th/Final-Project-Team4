package com.team4.identity.user;

import com.team4.identity.auth.mail.MailSender;
import com.team4.identity.user.repository.UserRepository;
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

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 마이페이지 - 내 프로필 조회 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MyProfileTest {

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

    @Test
    void X_User_Id_헤더로_내_업체정보를_조회한다() throws Exception {
        Long userId = userRepository.findByEmail("manager@corp.com").orElseThrow().getId();

        mockMvc.perform(get("/api/auth/me").header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.companyName").value("코퍼레이션"))
                .andExpect(jsonPath("$.data.businessNo").value("1234567890"))
                .andExpect(jsonPath("$.data.role").value("EXHIBITOR"));
    }

    @Test
    void X_User_Id_헤더가_없으면_401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
