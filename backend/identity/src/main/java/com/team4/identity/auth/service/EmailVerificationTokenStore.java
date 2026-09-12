package com.team4.identity.auth.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

// 이메일 인증 토큰 저장소
@Component
public class EmailVerificationTokenStore {

    private final RedisTokenStore store;

    public EmailVerificationTokenStore(StringRedisTemplate redis) {
        this.store = new RedisTokenStore(redis, "emailverify:");
    }

    // 인증 메일 발송 - 랜덤 토큰을 발급하고 해시를 emailverify:<userId>에 저장(재발송 시 이전 토큰 무효화)
    public String issue(Long userId, Duration ttl) {
        return store.issue(userId, ttl);
    }

    // 인증 확인 - 최신 발급본과 일치하면 userId를 반환하고 키를 삭제, 아니면 empty
    public Optional<Long> consume(String token) {
        return store.consume(token);
    }
}
