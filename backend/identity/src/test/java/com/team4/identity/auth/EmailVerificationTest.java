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
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 일반 회원가입 -> 이메일 인증 전에는 로그인 불가 -> 인증 링크로 확인하면 로그인 가능
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmailVerificationTest {

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

    // 실제 발송 대신 목으로 바꿔서 링크(토큰)를 캡처함
    @MockBean
    MailSender mailSender;

    @BeforeEach
    void signUp() throws Exception {
        userRepository.deleteAllInBatch();
        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(SIGNUP_BODY));
    }

    private String captureLatestToken() {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailSender, atLeastOnce()).send(eq("member@example.com"), any(), body.capture());

        String latest = body.getAllValues().get(body.getAllValues().size() - 1);
        Matcher m = Pattern.compile("token=(\\S+)").matcher(latest);
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    private void signIn(int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"member@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().is(expectedStatus));
    }

    private void confirmVerification(String token, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void 가입_직후에는_이메일_인증_전이라_로그인이_403() throws Exception {
        signIn(403);
    }

    @Test
    void 인증_링크를_확인하면_로그인할_수_있다() throws Exception {
        String token = captureLatestToken();

        confirmVerification(token, 200);

        signIn(200);
    }

    @Test
    void 위조된_토큰은_400() throws Exception {
        confirmVerification("garbage-token", 400);
    }

    @Test
    void 이미_사용한_토큰으로는_다시_인증할_수_없다() throws Exception {
        String token = captureLatestToken();

        confirmVerification(token, 200);
        confirmVerification(token, 400);
    }

    @Test
    void 재발송하면_이전_링크는_무효화되고_새_링크만_유효하다() throws Exception {
        String oldToken = captureLatestToken();

        mockMvc.perform(post("/api/auth/verify-email/resend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"member@example.com\"}"))
                .andExpect(status().isOk());
        String newToken = captureLatestToken();

        confirmVerification(oldToken, 400);
        confirmVerification(newToken, 200);
    }

    @Test
    void 미가입_이메일로_재발송_요청해도_200이고_메일은_발송되지_않는다() throws Exception {
        captureLatestToken(); // 가입 시 발송된 메일을 소비해서 아래 verifyNoInteractions와 섞이지 않게 함

        org.mockito.Mockito.reset(mailSender);

        mockMvc.perform(post("/api/auth/verify-email/resend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isOk());

        verifyNoInteractions(mailSender);
    }
}
