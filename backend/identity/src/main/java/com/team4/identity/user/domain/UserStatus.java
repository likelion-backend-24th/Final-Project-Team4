package com.team4.identity.user.domain;

public enum UserStatus {
    UNVERIFIED, // 가입 직후, 이메일 인증 전
    ACTIVE,
    LOCKED,
    WITHDRAWN
}
