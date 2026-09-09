package com.team4.identity.user.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.dto.InternalUserResponse;
import com.team4.identity.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/identity")
public class UserInternalController {

    private final UserRepository userRepository;

    @Value("${service.token.expo}")
    private String expoServiceToken;

    public UserInternalController(UserRepository userRepository) {
        this.userRepository = userRepository;
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

    private void requireExpoService(String authorization) {
        String expected = "Bearer " + expoServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}