package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.mail.MailSender;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Duration TOKEN_TTL = Duration.ofMinutes(30); // 30분

    private final UserRepository userRepository;
    private final PasswordResetTokenStore pwrtokenStore;
    private final RefreshTokenStore refreshTokenStore;
    private final PasswordEncoder passwordEncoder;
    private final MailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // 재설정 요청 - 가입 여부와 무관하게 항상 메일을 한 번 보내서 응답 시간으로 가입 여부가 새지 않게 함
    @Transactional(readOnly = true)
    public void request(String email) {
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            mailSender.send(email, "[모빌리티 엑스포] 비밀번호 재설정 안내", "가입 내역이 없는 이메일입니다.");
            return;
        }

        String token = pwrtokenStore.issue(user.getId(), TOKEN_TTL);
        String link = frontendUrl + "/reset-password?token=" + token;
        mailSender.send(user.getEmail(), "[모빌리티 엑스포] 비밀번호 재설정 안내", "아래 링크에서 새 비밀번호를 설정하세요. 링크는 30분간 유효합니다.\n" + link);
    }

    // 재설정 확인
    @Transactional
    public void confirm(String token, String newPassword) {
        // 토큰 소비
        Long userId = pwrtokenStore.consume(token).orElseThrow(() -> new CustomException(ErrorCode.VALIDATION_ERROR, "만료되었거나 유효하지 않은 링크입니다."));
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.VALIDATION_ERROR, "유효하지 않은 링크입니다."));

        user.updatePassword(passwordEncoder.encode(newPassword));

        refreshTokenStore.delete(userId);
    }
}
