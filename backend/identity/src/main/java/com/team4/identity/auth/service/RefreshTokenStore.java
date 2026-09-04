package com.team4.identity.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;

// refreshToken SHA-256 해시를 Redis에 저장
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private static final String KEY_PREFIX = "refresh:";

    private final StringRedisTemplate redis;

    public void save(Long userId, String refreshToken, Duration ttl) {
        redis.opsForValue().set(KEY_PREFIX + userId, hash(refreshToken), ttl);
    }

    public boolean matches(Long userId, String refreshToken) {
        String stored = redis.opsForValue().get(KEY_PREFIX + userId);
        return stored != null && stored.equals(hash(refreshToken));
    }

    public void delete(Long userId) {
        redis.delete(KEY_PREFIX + userId);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", e);
        }
    }
}
