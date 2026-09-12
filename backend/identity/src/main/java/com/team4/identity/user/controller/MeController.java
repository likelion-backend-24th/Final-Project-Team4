package com.team4.identity.user.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.identity.auth.service.RefreshTokenStore;
import com.team4.identity.auth.service.SignInService;
import com.team4.identity.security.jwt.CookieProvider;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.dto.MyProfileResponse;
import com.team4.identity.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 마이페이지 - 내 프로필 조회 / 회원 탈퇴
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class MeController {

    private final SignInService signInService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MyProfileResponse>> me(@RequestHeader("X-User-Id") Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return ResponseEntity.ok(ApiResponse.success(MyProfileResponse.from(user)));
    }

    // 회원 탈퇴(soft delete)
    @DeleteMapping("/me")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> withdraw(@RequestHeader("X-User-Id") Long userId, HttpServletResponse response) {
        signInService.withdrawUser(userId, response);

        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
