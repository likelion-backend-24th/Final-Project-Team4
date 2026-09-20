package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.dto.TokenResponse;
import com.team4.identity.security.jwt.CookieProvider;
import com.team4.identity.user.domain.AuthProvider;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

// 소셜 로그인 계정 연동 - 이메일로 기존 USER 계정과 연동하거나 신규 생성
// 같은 이메일이 EXHIBITOR로 가입돼 있으면 계정 종류 충돌로 거부
// 신규 회원은 약관 동의를 받아야 하므로 바로 만들지 않고, 가입 보류 후 동의 완료 시점에 생성
@Service
@RequiredArgsConstructor
public class SocialLoginService {

    public static final String SIGNUP_COOKIE = "socialSignup";
    private static final String SIGNUP_KEY_PREFIX = "social-signup:";
    private static final Duration SIGNUP_TTL = Duration.ofMinutes(10); // 동의 화면에서 머무를 수 있는 시간

    private final UserRepository userRepository;
    private final SignInService signInService;
    private final CookieProvider cookieProvider;
    private final StringRedisTemplate redis;

    // 기존 회원이면 바로 로그인시키고, 신규 회원이면 empty
    @Transactional
    public Optional<TokenResponse> loginIfExists(String email, HttpServletResponse response) {
        return userRepository.findByEmail(email)
                .map(this::checkLinkable)
                .map(user -> signInService.issue(user, response));
    }

    // 신규 회원의 가입을 보류 - 소셜 provider 정보를 Redis에 두고 그 키인 랜덤 토큰을 HttpOnly 쿠키로 내려줌
    public void reserveSignUp(String email, AuthProvider provider, String providerId, String name, HttpServletResponse response) {
        String token = UUID.randomUUID().toString();
        String key = SIGNUP_KEY_PREFIX + token;
        redis.opsForHash().putAll(key, Map.of(
                "email", email,
                "provider", provider.name(),
                "providerId", providerId,
                "name", Objects.toString(name, "")));
        redis.expire(key, SIGNUP_TTL);

        response.addHeader(HttpHeaders.SET_COOKIE, cookieProvider.createCookie(SIGNUP_COOKIE, token, SIGNUP_TTL).toString());
    }

    // 약관 동의 완료 - 보류해둔 정보로 회원을 만들고 로그인
    @Transactional
    public TokenResponse completeSignUp(String token, HttpServletResponse response) {
        String key = SIGNUP_KEY_PREFIX + token;
        HashOperations<String, String, String> hash = redis.opsForHash();
        Map<String, String> pending = hash.entries(key);

        if (pending.isEmpty()) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "가입 요청이 만료되었습니다. 소셜 로그인을 다시 시도해주세요.");
        }

        redis.delete(key);

        User user = userRepository.findByEmail(pending.get("email"))
                .map(this::checkLinkable)
                .orElseGet(() -> userRepository.save(User.createSocialMember(
                        pending.get("email"), AuthProvider.valueOf(pending.get("provider")), pending.get("providerId"), pending.get("name")
                )));

        response.addHeader(HttpHeaders.SET_COOKIE, cookieProvider.clearCookie(SIGNUP_COOKIE).toString());

        return signInService.issue(user, response);
    }

    private User checkLinkable(User user) {
        if (user.getRole() == Role.EXHIBITOR) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 참가업체로 가입된 이메일입니다.");
        }
        return user;
    }
}
