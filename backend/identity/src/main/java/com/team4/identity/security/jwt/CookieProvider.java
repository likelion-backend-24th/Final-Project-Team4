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

    public ResponseCookie createCookie(String name, String value, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
    }

    public ResponseCookie clearCookie(String name) {
        return createCookie(name, "", Duration.ZERO);
    }
}
