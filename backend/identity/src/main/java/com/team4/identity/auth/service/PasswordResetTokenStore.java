package com.team4.identity.auth.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

// 비밀번호 재설정 토큰 저장소
@Component
public class PasswordResetTokenStore {

    private final RedisTokenStore store;

    public PasswordResetTokenStore(StringRedisTemplate redis) {
        this.store = new RedisTokenStore(redis, "pwreset:");
    }

    // 패스워드 재설정 요청 - 랜덤 토큰을 발급하고 해시를 pwreset:<userId>에 저장(기존 값 덮어씀)
    public String issue(Long userId, Duration ttl) {
        return store.issue(userId, ttl);
    }

    // 패스워드 재설정 확인 - 토큰이 해당 사용자의 최신 발급본과 일치하면 userId를 반환하고 키를 삭제하지만
    // 이전 링크 / 위조 / 만료 / 이미 사용이라면 -> empty
    public Optional<Long> consume(String token) {
        return store.consume(token);
    }
}
