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

    // 패스워드 재설정 요청 - 랜덤 토큰을 발급하고 해시를 pwreset:<userId>에 저장(기존 값 덮어씀)
    public String issue(Long userId, Duration ttl) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = userId + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); // 마지막 이메일만 유효하게 하기위해 token에 userId 포함

        redis.opsForValue().set(KEY_PREFIX + userId, hash(token), ttl); // userId당 1건, 재요청 시 이전 토큰 해시를 덮어씀

        return token;
    }

    // 패스워드 재설정 확인 - 토큰이 해당 사용자의 최신 발급본과 일치하면 userId를 반환하고 키를 삭제하지만
    // 이전 링크 / 위조 / 만료 / 이미 사용이라면 -> empty
    public Optional<Long> consume(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot <= 0) { // token에 userId가 없다면
            return Optional.empty();
        }
        Long userId;
        try {
            userId = Long.valueOf(token.substring(0, dot));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }

        String key = KEY_PREFIX + userId;
        String stored = redis.opsForValue().get(key);
        if (stored == null || !stored.equals(hash(token))) {
            return Optional.empty();
        }

        redis.delete(key);

        return Optional.of(userId);
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
