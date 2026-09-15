package com.team4.identity.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Optional;

// refreshToken SHA-256 해시를 Redis에 저장. 값 앞 1글자는 rememberMe 여부('1'/'0')
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private static final String KEY_PREFIX = "refresh:";

    private final StringRedisTemplate redis;

    public void save(Long userId, String refreshToken, Duration ttl, boolean rememberMe) {
        redis.opsForValue().set(KEY_PREFIX + userId, (rememberMe ? "1" : "0") + hash(refreshToken), ttl);
    }

    // 토큰이 일치하면 저장 당시의 rememberMe 값을 반환
    public Optional<Boolean> validate(Long userId, String refreshToken) {
        String stored = redis.opsForValue().get(KEY_PREFIX + userId);

        if (stored == null || !stored.substring(1).equals(hash(refreshToken))) {
            return Optional.empty();
        }

        return Optional.of(stored.charAt(0) == '1');
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
