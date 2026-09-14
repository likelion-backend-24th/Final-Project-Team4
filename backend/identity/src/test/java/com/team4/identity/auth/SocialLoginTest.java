package com.team4.identity.auth;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.dto.TokenResponse;
import com.team4.identity.auth.service.SocialLoginService;
import com.team4.identity.user.domain.AuthProvider;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// STORY 12-1 - 소셜 로그인 계정 연동 Acceptance Test
@SpringBootTest
@ActiveProfiles("test")
class SocialLoginTest {

    @Autowired
    SocialLoginService socialLoginService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @BeforeEach
    void clean() {
        userRepository.deleteAllInBatch();
    }

    @Test
    void 신규_이메일이면_USER_계정을_즉시_ACTIVE로_생성하고_토큰을_발급한다() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        TokenResponse token = socialLoginService.loginOrSignUp(
                "newbie@gmail.com", AuthProvider.GOOGLE, "google-sub-1", "홍길동", response);

        assertThat(token.getAccessToken()).isNotBlank();
        assertThat(token.getRole()).isEqualTo("USER");
        assertThat(response.getHeader("Set-Cookie")).contains("refreshToken=");

        User created = userRepository.findByEmail("newbie@gmail.com").orElseThrow();
        assertThat(created.getRole()).isEqualTo(Role.USER);
        assertThat(created.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void 이미_가입된_USER_이메일이면_기존_계정으로_연동해서_토큰을_발급한다() {
        User existing = userRepository.save(
                User.createMember("member@gmail.com", passwordEncoder.encode("password123"), "기존회원", "010-0000-0000"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        TokenResponse token = socialLoginService.loginOrSignUp(
                "member@gmail.com", AuthProvider.KAKAO, "kakao-id-1", "카카오닉네임", response);

        assertThat(token.getRole()).isEqualTo("USER");
        assertThat(userRepository.count()).isEqualTo(1); // 새 계정이 생기지 않고 기존 계정 하나로 연동됨
        assertThat(userRepository.findByEmail("member@gmail.com").orElseThrow().getId()).isEqualTo(existing.getId());
    }

    @Test
    void 같은_이메일이_참가업체로_가입돼있으면_409_DUPLICATE로_거부한다() {
        userRepository.save(User.createExhibitor(
                "biz@corp.com", passwordEncoder.encode("password123"), "123-45-67890",
                "코퍼레이션", "담당자", "010-1234-5678", "서울시 강남구", "제조업", "대표자", "02-1234-5678"));

        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThatThrownBy(() -> socialLoginService.loginOrSignUp(
                "biz@corp.com", AuthProvider.NAVER, "naver-id-1", "네이버닉네임", response))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> assertThat(((CustomException) ex).errorCode()).isEqualTo(ErrorCode.DUPLICATE));
    }
}
