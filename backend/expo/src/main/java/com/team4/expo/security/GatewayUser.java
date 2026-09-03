package com.team4.expo.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class GatewayUser { // Gateway로부터 심어진 user의 id, role 헤더 정보
    private final Long id;
    private final String role;
}
