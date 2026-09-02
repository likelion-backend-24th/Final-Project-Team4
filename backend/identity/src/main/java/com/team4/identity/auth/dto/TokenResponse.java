package com.team4.identity.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TokenResponse {

    private final String accessToken;
    private final String refreshToken;
    private final String tokenType;   // Bearer
    private final long expiresIn;     // accessToken 만료 남은 시간
    private final String role;
}
