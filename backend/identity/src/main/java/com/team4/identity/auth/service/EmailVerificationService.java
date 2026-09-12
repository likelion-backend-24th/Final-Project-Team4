package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.mail.MailSender;
import com.team4.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(10); // 인증 코드 유효 시간
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(30); // 인증 후 가입을 완료해야 하는 유효 시간
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_KEY_PREFIX = "emailcode:";
    private static final String VERIFIED_KEY_PREFIX = "emailverified:";

    private final StringRedisTemplate redis;
    private final MailSender mailSender;
    private final UserRepository userRepository;

    // 인증 코드 발송
    public void sendCode(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 사용 중인 이메일입니다.");
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        redis.opsForValue().set(CODE_KEY_PREFIX + email, code, CODE_TTL);
        mailSender.send(email, "[모빌리티 엑스포] 이메일 인증 코드", "아래 인증 코드를 회원가입 화면에 입력해주세요. 코드는 10분간 유효합니다.\n\n" + code);
    }

    // 인증 코드 확인
    public void confirmCode(String email, String code) {
        String codeKey = CODE_KEY_PREFIX + email;
        String stored = redis.opsForValue().get(codeKey);

        if (stored == null || !stored.equals(code)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "인증 코드가 올바르지 않거나 만료되었습니다.");
        }

        redis.delete(codeKey);
        redis.opsForValue().set(VERIFIED_KEY_PREFIX + email, "true", VERIFIED_TTL);
    }

    // 가입 처리 직전 확인 + 같은 인증으로 재가입 방지
    public void requireVerified(String email) {
        String key = VERIFIED_KEY_PREFIX + email;

        if (!redis.hasKey(key)) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED, "이메일 인증을 먼저 완료해주세요.");
        }

        redis.delete(key);
    }
}
