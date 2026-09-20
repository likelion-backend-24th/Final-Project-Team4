package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.jwt.JwtProvider;
import com.team4.identity.auth.dto.TokenResponse;
import com.team4.identity.reservation.client.ReservationClient;
import com.team4.identity.security.jwt.CookieProvider;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
public class SignInService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenStore refreshTokenStore;
    private final CookieProvider cookieProvider;
    private final ReservationClient reservationClient;
    private final String dummyPasswordHash; // 타이밍 공격 방지용 더미 해시 - 가입 안 된 이메일도 이 해시로 검증하여 로그인 실패 응답 속도를 존재하는 이메일이랑 맞춤

    public SignInService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtProvider jwtProvider,
                          RefreshTokenStore refreshTokenStore, CookieProvider cookieProvider,
                         ReservationClient reservationClient) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.refreshTokenStore = refreshTokenStore;
        this.cookieProvider = cookieProvider;
        this.reservationClient = reservationClient;
        this.dummyPasswordHash = passwordEncoder.encode("dummy-password-for-timing-safety");
    }

    // 이메일 로그인 - 일반회원,관리자,참가업체 공통
    @Transactional(readOnly = true)
    public TokenResponse signIn(String email, String rawPassword, boolean rememberMe, HttpServletResponse response) {
        User user = userRepository.findByEmail(email).orElse(null);
        String hashToCheck = (user != null) ? user.getPasswordHash() : dummyPasswordHash;

        if (!passwordEncoder.matches(rawPassword, hashToCheck) || user == null) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        if (user.getStatus() == UserStatus.WITHDRAWN) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "탈퇴한 계정입니다.");
        }

        return issue(user, rememberMe, response);
    }

    // 재발급
    @Transactional(readOnly = true)
    public TokenResponse reissue(String refreshToken, HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "리프레시 토큰이 없습니다.");
        }

        Long userId = parseUserId(refreshToken);

        boolean rememberMe = refreshTokenStore.validate(userId, refreshToken).orElseThrow(() -> new CustomException(ErrorCode.UNAUTHENTICATED, "만료된 리프레시 토큰입니다."));

        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.UNAUTHENTICATED, "유효하지 않은 리프레시 토큰입니다."));

        return issue(user, rememberMe, response);
    }

    // 로그아웃
    public void logout(String refreshToken, HttpServletResponse response) {
        addCookie(response, cookieProvider.clearCookie("refreshToken").toString());

        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            refreshTokenStore.delete(parseUserId(refreshToken));
        } catch (CustomException ignored) {}
    }

    // 회원 탈퇴 (soft delete)
    @Transactional
    public void withdrawUser(Long userId, HttpServletResponse response){
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        reservationClient.invalidateAllTickets(userId);

        user.withdraw();
        refreshTokenStore.delete(userId);
        addCookie(response, cookieProvider.clearCookie("refreshToken").toString());
    }

    private Long parseUserId(String refreshToken) {
        try {
            return Long.valueOf(jwtProvider.parseRefreshToken(refreshToken).getSubject());
        } catch (JwtException | NumberFormatException e) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "유효하지 않은 리프레시 토큰입니다.");
        }
    }

    // 소셜 로그인에서 재사용 - 소셜 로그인은 항상 로그인 유지
    public TokenResponse issue(User user, HttpServletResponse response) {
        return issue(user, true, response);
    }

    public TokenResponse issue(User user, boolean rememberMe, HttpServletResponse response) {
        String role = user.getRole().name();
        Duration refreshTtl = Duration.ofMillis(jwtProvider.getRefreshTokenExp());

        String accessToken = jwtProvider.createAccessToken(user.getId(), role);
        String refreshToken = jwtProvider.createRefreshToken(user.getId());
        refreshTokenStore.save(user.getId(), refreshToken, refreshTtl, rememberMe);

        ResponseCookie cookie = rememberMe
                ? cookieProvider.createCookie("refreshToken", refreshToken, refreshTtl)
                : cookieProvider.createSessionCookie("refreshToken", refreshToken);

        addCookie(response, cookie.toString());

        return TokenResponse.of(accessToken, jwtProvider.getAccessTokenExp() / 1000, role, rememberMe);
    }

    private void addCookie(HttpServletResponse response, String cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie);
    }
}
