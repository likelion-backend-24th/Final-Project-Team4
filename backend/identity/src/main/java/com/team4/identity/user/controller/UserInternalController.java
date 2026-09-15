package com.team4.identity.user.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.identity.auth.mail.MailSender;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.dto.InternalMailRequest;
import com.team4.identity.user.dto.InternalUserResponse;
import com.team4.identity.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/identity")
public class UserInternalController {

    private final UserRepository userRepository;
    private final MailSender mailSender;

    @Value("${service.token.expo}")
    private String expoServiceToken;

    public UserInternalController(UserRepository userRepository, MailSender mailSender) {
        this.userRepository = userRepository;
        this.mailSender = mailSender;
    }

    // Expo -> Identity. 부스에 배정된 참가업체의 회사명/업종 표시용.
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<InternalUserResponse>> getUser(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long userId) {

        requireExpoService(authorization);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다. userId=" + userId));

        return ResponseEntity.ok(ApiResponse.success(InternalUserResponse.from(user)));
    }

    // Expo -> Identity. 참가업체 리드 이메일 발송(TASK 11-4) - 기존 비밀번호 재설정과 같은 MailSender(app.mail.provider) 재사용.
    // 발송 실패는 MailSender가 던지는 예외를 그대로 전파 - GlobalExceptionHandler가 500으로 응답(재시도 가능하도록 상태 변경 없음).
    @PostMapping("/mails")
    public ResponseEntity<ApiResponse<Void>> sendMail(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody InternalMailRequest request) {

        requireExpoService(authorization);

        mailSender.send(request.to(), request.subject(), request.body());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private void requireExpoService(String authorization) {
        String expected = "Bearer " + expoServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}