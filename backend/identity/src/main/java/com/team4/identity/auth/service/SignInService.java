package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.jwt.JwtProvider;
import com.team4.identity.auth.dto.TokenResponse;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class SignInService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenStore refreshTokenStore;

    // 일반회원, 관리자 - 이메일 로그인
    @Transactional(readOnly = true)
    public TokenResponse signIn(String email, String rawPassword) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new CustomException(ErrorCode.UNAUTHENTICATED, "이메일 또는 비밀번호가 올바르지 않습니다."));
        verifyPassword(rawPassword, user, "이메일 또는 비밀번호가 올바르지 않습니다.");

        return issue(user);
    }

    // 참가업체 - 사업자등록번호 로그인
    @Transactional(readOnly = true)
    public TokenResponse signInExhibitor(String businessNo, String rawPassword) {
        String normalized = businessNo == null ? null : businessNo.replace("-", "");
        User user = userRepository.findByBusinessNo(normalized).orElseThrow(() -> new CustomException(ErrorCode.UNAUTHENTICATED, "사업자등록번호 또는 비밀번호가 올바르지 않습니다."));
        verifyPassword(rawPassword, user, "사업자등록번호 또는 비밀번호가 올바르지 않습니다.");

        return issue(user);
    }

    // 재발급
    @Transactional(readOnly = true)
    public TokenResponse reissue(String refreshToken) {
        Long userId = parseUserId(refreshToken);

        if (!refreshTokenStore.matches(userId, refreshToken)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "만료된 리프레시 토큰입니다.");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.UNAUTHENTICATED, "유효하지 않은 리프레시 토큰입니다."));

        return issue(user);
    }

    // 로그아웃
    public void logout(String refreshToken) {
        try {
            refreshTokenStore.delete(parseUserId(refreshToken));
        } catch (CustomException ignored) {}
    }

    private void verifyPassword(String rawPassword, User user, String message) {
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, message);
        }
    }

    private Long parseUserId(String refreshToken) {
        try {
            return Long.valueOf(jwtProvider.parseRefreshToken(refreshToken).getSubject());
        } catch (JwtException | NumberFormatException e) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "유효하지 않은 리프레시 토큰입니다.");
        }
    }

    private TokenResponse issue(User user) {
        String role = user.getRole().name();
        String accessToken = jwtProvider.createAccessToken(user.getId(), role);
        String refreshToken = jwtProvider.createRefreshToken(user.getId());

        refreshTokenStore.save(user.getId(), refreshToken, Duration.ofMillis(jwtProvider.getRefreshTokenExp()));

        return new TokenResponse(accessToken, refreshToken, "Bearer", jwtProvider.getAccessTokenExp() / 1000, role);
    }
}
