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

    public static TokenResponse of(String accessToken, long expiresIn, String role) {
        return new TokenResponse(accessToken, "Bearer", expiresIn, role);
    }
}
