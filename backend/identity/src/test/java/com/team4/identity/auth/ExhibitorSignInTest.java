package com.team4.identity.auth;

import com.team4.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


// TASK 1-2 - 참가업체 로그인 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExhibitorSignInTest {

    private static final String SIGNUP_BODY = """
            {
              "businessNo": "123-45-67890",
              "password": "password123",
              "email": "manager@corp.com",
              "companyName": "코퍼레이션",
              "managerName": "KJH",
              "contact": "010-1234-5678"
            }
            """;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void signUp() throws Exception {
        userRepository.deleteAllInBatch();
        mockMvc.perform(post("/api/auth/exhibitors/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(SIGNUP_BODY));
    }

    @Test
    void 정상_로그인시_accessToken은_body_refreshToken은_HttpOnly쿠키로_반환한다() throws Exception {
        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"manager@corp.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.role").value("EXHIBITOR"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(cookie().exists("refreshToken"))
                .andExpect(cookie().httpOnly("refreshToken", true))
                .andExpect(cookie().value("refreshToken", org.hamcrest.Matchers.not(org.hamcrest.Matchers.emptyString())));
    }

    @Test
    void 비밀번호가_틀리면_401_WWW_Authenticate_헤더() throws Exception {
        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"manager@corp.com\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"));
    }

    @Test
    void 없는_이메일은_401() throws Exception {
        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@corp.com\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
    }
}
