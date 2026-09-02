package com.team4.identity.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

// refreshToken을 Redis에 저장
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private static final String KEY_PREFIX = "refresh:";

    private final StringRedisTemplate redis;

    public void save(Long userId, String refreshToken, Duration ttl) {
        redis.opsForValue().set(KEY_PREFIX + userId, refreshToken, ttl);
    }

    public boolean matches(Long userId, String refreshToken) {
        String stored = redis.opsForValue().get(KEY_PREFIX + userId);
        return stored != null && stored.equals(refreshToken);
    }

    public void delete(Long userId) {
        redis.delete(KEY_PREFIX + userId);
    }
}
