package com.team4.identity.auth;

import com.team4.identity.auth.mail.MailSender;
import com.team4.identity.user.domain.User;
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
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 일반 회원(USER) 회원가입 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserSignupTest {

    private static final String SIGNUP_BODY = """
            {
              "email": "member@example.com",
              "password": "password123",
              "name": "홍길동",
              "phone": "010-1234-5678"
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
    void clean() {
        userRepository.deleteAllInBatch();
    }

    private void verifyEmail(String email) throws Exception {
        mockMvc.perform(post("/api/auth/email-verification/code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailSender, atLeastOnce()).send(eq(email), any(), body.capture());
        String latest = body.getAllValues().get(body.getAllValues().size() - 1);
        Matcher m = Pattern.compile("(\\d{6})\\s*$").matcher(latest);
        assertThat(m.find()).isTrue();

        mockMvc.perform(post("/api/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"code\":\"" + m.group(1) + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void 정상_회원가입시_USER_계정이_생성_비밀번호는_해시로_저장된다() throws Exception {
        verifyEmail("member@example.com");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGNUP_BODY))
                .andExpect(status().isCreated());

        User saved = userRepository.findByEmail("member@example.com").orElseThrow();
        assertThat(saved.getRole().name()).isEqualTo("USER");
        assertThat(saved.getBusinessNo()).isNull();
        assertThat(saved.getPasswordHash()).isNotEqualTo("password123");
        assertThat(saved.getPasswordHash()).startsWith("$2");
        assertThat(saved.getName()).isEqualTo("홍길동");
        assertThat(saved.getContact()).isEqualTo("010-1234-5678");
    }

    @Test
    void 이메일_인증을_거치지_않으면_400() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGNUP_BODY))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 이름이_없으면_400() throws Exception {
        String badBody = SIGNUP_BODY.replace("\"홍길동\"", "\"\"");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 이미_가입된_이메일로는_인증코드_발송이_거부된다() throws Exception {
        verifyEmail("member@example.com");
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGNUP_BODY))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/email-verification/code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"member@example.com\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void 이메일_형식이_틀리면_400() throws Exception {
        String badBody = SIGNUP_BODY.replace("member@example.com", "not-an-email");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 비밀번호가_8자_미만이면_400() throws Exception {
        String badBody = SIGNUP_BODY.replace("password123", "short");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest());
    }
}
