package com.team4.identity.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;

// 비밀번호 재설정 토큰 저장소
@Component
@RequiredArgsConstructor
public class PasswordResetTokenStore {

    private static final String KEY_PREFIX = "pwreset:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redis;

    // 패스워드 재설정 요청 - 랜덤 토큰을 발급하고 키 pwreset:해시에 값 userId 로 저장.
    public String issue(Long userId, Duration ttl) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        redis.opsForValue().set(KEY_PREFIX + hash(token), userId.toString(), ttl);

        return token;
    }

    // 패스워드 재설정 확인 - 토큰에 해당하는 userId를 반환하고 즉시 삭제
    public Optional<Long> consume(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String userId = redis.opsForValue().getAndDelete(KEY_PREFIX + hash(token));
        return Optional.ofNullable(userId).map(Long::valueOf);
    }

    // 해싱
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
