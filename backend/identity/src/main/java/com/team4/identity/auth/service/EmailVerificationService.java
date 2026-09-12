package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.mail.MailSender;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration TOKEN_TTL = Duration.ofHours(24);

    private final UserRepository userRepository;
    private final EmailVerificationTokenStore tokenStore;
    private final MailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // 가입 직후 인증 메일 발송
    @Transactional(readOnly = true)
    public void issueAndSend(User user) {
        String token = tokenStore.issue(user.getId(), TOKEN_TTL);
        String link = frontendUrl + "/verify-email?token=" + token;
        mailSender.send(user.getEmail(), "[모빌리티 엑스포] 이메일 인증 안내", "아래 링크에서 이메일 인증을 완료하세요. 링크는 24시간 동안 유효합니다.\n" + link);
    }

    // 인증 메일 재발송
    @Transactional(readOnly = true)
    public void resend(String email) {
        userRepository.findByEmail(email)
                .filter(user -> user.getStatus() == UserStatus.UNVERIFIED)
                .ifPresent(this::issueAndSend);
    }

    // 인증 확인
    @Transactional
    public void verify(String token) {
        Long userId = tokenStore.consume(token).orElseThrow(() -> new CustomException(ErrorCode.VALIDATION_ERROR, "만료되었거나 유효하지 않은 링크입니다."));
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.VALIDATION_ERROR, "유효하지 않은 링크입니다."));

        user.verifyEmail();
    }
}
