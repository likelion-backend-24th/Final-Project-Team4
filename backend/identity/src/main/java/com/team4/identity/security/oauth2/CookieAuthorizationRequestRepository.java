package com.team4.identity.security.oauth2;

import com.team4.identity.security.jwt.CookieProvider;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.serializer.support.SerializationFailedException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.SerializationUtils;

import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CookieAuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {
    // AuthorizationRequestRepository - oauth2 로그인에서 제공자로 리다이렉트한 요청과, 제공자가 돌려보낸 콜백 요청을 같은 로그인 시도로 묶어주는 저장소
    // oauth2의 기본 구현은 HttpSession에 저장하지만 JWT 사용 이유인 STATELESS를 유지하기 위해 세션 대신 쿠키에 담도록 함

    private static final String COOKIE_NAME = "oauth2_auth_request";
    private static final Duration COOKIE_MAX_AGE = Duration.ofMinutes(5); // 로그인 승인까지만 살아있으면 됨

    private final CookieProvider cookieProvider;

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return readCookie(request).map(this::deserialize).orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest, HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            clearCookie(response);
            return;
        }
        addCookie(response, cookieProvider.createCookie(COOKIE_NAME, serialize(authorizationRequest), COOKIE_MAX_AGE, "/", "Lax"));
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
        clearCookie(response);
        return authorizationRequest;
    }

    private Optional<Cookie> readCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return Optional.empty();
        }
        return Arrays.stream(request.getCookies())
                .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                .findFirst();
    }

    private void clearCookie(HttpServletResponse response) {
        addCookie(response, cookieProvider.createCookie(COOKIE_NAME, "", Duration.ZERO, "/", "Lax"));
    }

    private void addCookie(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    // 직렬화 - 객체 -> 바이트 배열로 변환 (saveAuthorizationRequest에서, 쿠키에 넣기 전)
    private String serialize(OAuth2AuthorizationRequest authorizationRequest) {
        return Base64.getUrlEncoder().encodeToString(SerializationUtils.serialize(authorizationRequest));
    }

    // 역직렬화 - 바이트 배열 -> 객체로 복원 (loadAuthorizationRequest에서, 콜백 요청 때 쿠키 읽고 나서)
    private OAuth2AuthorizationRequest deserialize(Cookie cookie) {
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(cookie.getValue());
            return (OAuth2AuthorizationRequest) SerializationUtils.deserialize(bytes);
        } catch (IllegalArgumentException | SerializationFailedException e) {
            return null; // 쿠키 위변조나 만료 시 null 반환
        }
    }
}
