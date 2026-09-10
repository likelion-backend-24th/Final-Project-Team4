package com.team4.identity.auth.controller;

import com.team4.common.response.ApiResponse;
import com.team4.identity.auth.dto.*;
import com.team4.identity.auth.service.PasswordResetService;
import com.team4.identity.auth.service.SignInService;
import com.team4.identity.auth.service.SignUpService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final SignUpService signUpService;
    private final SignInService signInService;
    private final PasswordResetService passwordResetService;

    // 일반 회원(USER) 회원가입
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signUp(@Valid @RequestBody SignUpUserRequest request) {
        signUpService.signUpUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }

    // 참가업체 회원가입(+사업자등록번호)
    @PostMapping("/exhibitors/signup")
    public ResponseEntity<ApiResponse<Void>> signUpExhibitor(@Valid @RequestBody SignUpExhibitorRequest request) {
        signUpService.signUpExhibitor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }

    @PostMapping("/signin")
    public ResponseEntity<ApiResponse<TokenResponse>> signIn(@Valid @RequestBody SignInRequest request, HttpServletResponse response) {
        TokenResponse token = signInService.signIn(request.getEmail(), request.getPassword(), response);
        return ResponseEntity.ok(ApiResponse.success(token));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@CookieValue(name = "refreshToken", required = false) String refreshToken, HttpServletResponse response) {
        TokenResponse token = signInService.reissue(refreshToken, response);
        return ResponseEntity.ok(ApiResponse.success(token));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@CookieValue(name = "refreshToken", required = false) String refreshToken, HttpServletResponse response) {
        signInService.logout(refreshToken, response);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 비번 재설정 요청
    @PostMapping("/password-reset")
    public ResponseEntity<ApiResponse<Void>> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request){
        passwordResetService.request(request.getEmail());

        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 새 비번으로 변경
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request){
        passwordResetService.confirm(request.getToken(), request.getNewPassword());

        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
