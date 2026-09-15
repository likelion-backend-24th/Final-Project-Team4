package com.team4.identity.auth.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class TokenResponse {

    private final String accessToken;
    private final String tokenType;   // Bearer
    private final long expiresIn;     // accessToken 만료 남은 시간
    private final String role;
    private final boolean rememberMe; // rememberMe 체크에 따라 AT를 local/session storage 중 어디에 둘지 판단하는 기준

    public static TokenResponse of(String accessToken, long expiresIn, String role, boolean rememberMe) {
        return new TokenResponse(accessToken, "Bearer", expiresIn, role, rememberMe);
    }
}
