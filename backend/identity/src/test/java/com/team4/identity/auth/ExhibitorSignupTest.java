package com.team4.identity.auth;

import com.team4.identity.user.domain.User;
import com.team4.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// TASK 1-2 - 참가업체 회원가입 테스트
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExhibitorSignupTest {

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
    void clean() {
        userRepository.deleteAllInBatch();
    }

    @Test
    void 정상_회원가입시_EXHIBITOR_계정이_생성되고_비밀번호는_해시로_저장된다() throws Exception {
        mockMvc.perform(post("/api/auth/exhibitors/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGNUP_BODY))
                .andExpect(status().isCreated());

        User saved = userRepository.findByBusinessNo("1234567890").orElseThrow();
        assertThat(saved.getRole().name()).isEqualTo("EXHIBITOR");
        assertThat(saved.getPasswordHash()).isNotEqualTo("password123");
        assertThat(saved.getPasswordHash()).startsWith("$2");
    }

    @Test
    void 이미_가입된_사업자번호면_409() throws Exception {
        mockMvc.perform(post("/api/auth/exhibitors/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(SIGNUP_BODY));

        mockMvc.perform(post("/api/auth/exhibitors/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGNUP_BODY))
                .andExpect(status().isConflict());
    }

    @Test
    void 사업자번호_형식이_틀리면_400() throws Exception {
        String badBody = SIGNUP_BODY.replace("123-45-67890", "abc");

        mockMvc.perform(post("/api/auth/exhibitors/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest());
    }
}
