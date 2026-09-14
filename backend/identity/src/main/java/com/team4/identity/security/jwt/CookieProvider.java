package com.team4.identity.security.jwt;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class CookieProvider {

    @Value("${cookie.secure:false}")
    private boolean secure;

    @Value("${cookie.same-site:Strict}")
    private String sameSite;

    // 기존 로그인, refresh, 로그아웃에서 사용
    public ResponseCookie createCookie(String name, String value, Duration maxAge) {
        return createCookie(name, value, maxAge, "/api/auth", sameSite);
    }

    // oauth2를 세션 대신 쿠키 기반으로 동작하도록 구분짓기 위해 path, sameSite 받게함
    public ResponseCookie createCookie(String name, String value, Duration maxAge, String path, String sameSite){
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(maxAge)
                .build();
    }

    public ResponseCookie clearCookie(String name) {
        return createCookie(name, "", Duration.ZERO);
    }
}
