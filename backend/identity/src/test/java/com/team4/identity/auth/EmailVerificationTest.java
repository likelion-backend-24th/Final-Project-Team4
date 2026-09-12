package com.team4.identity.auth;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 회원가입 전 이메일 인증 코드 발송/확인
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmailVerificationTest {

    private static final String EMAIL = "member@example.com";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @MockBean
    MailSender mailSender;

    @BeforeEach
    void clean() {
        userRepository.deleteAllInBatch();
    }

    private void sendCode(int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/email-verification/code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    private String captureLatestCode() {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailSender, org.mockito.Mockito.atLeastOnce()).send(eq(EMAIL), any(), body.capture());

        String latest = body.getAllValues().get(body.getAllValues().size() - 1);
        Matcher m = Pattern.compile("(\\d{6})\\s*$").matcher(latest);
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    private void confirmCode(String code, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"code\":\"" + code + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    private void signUp(int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "member@example.com",
                                  "password": "password123",
                                  "name": "홍길동",
                                  "phone": "010-1234-5678"
                                }
                                """))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void 인증_코드를_확인하면_가입할_수_있다() throws Exception {
        sendCode(200);
        confirmCode(captureLatestCode(), 200);

        signUp(201);
    }

    @Test
    void 인증을_거치지_않으면_가입이_400() throws Exception {
        signUp(400);
    }

    @Test
    void 틀린_코드는_400() throws Exception {
        sendCode(200);
        captureLatestCode();

        confirmCode("000000", 400);
    }

    @Test
    void 인증된_이메일로_가입을_마치면_같은_인증으로_재가입할_수_없다() throws Exception {
        sendCode(200);
        confirmCode(captureLatestCode(), 200);
        signUp(201);

        // 계정이 이미 생겼으니 재가입 시도는 인증 없이도 이메일 중복으로 막혀야 함(가입 자체가 처음부터 불가)
        signUp(400);
    }

    @Test
    void 이미_가입된_이메일은_인증코드_발송부터_거부된다() throws Exception {
        sendCode(200);
        confirmCode(captureLatestCode(), 200);
        signUp(201);

        sendCode(409);
    }
}
