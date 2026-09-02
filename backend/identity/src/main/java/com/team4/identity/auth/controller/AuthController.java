package com.team4.identity.auth.controller;

import com.team4.common.response.ApiResponse;
import com.team4.identity.auth.dto.SignInExhibitorRequest;
import com.team4.identity.auth.dto.SignInRequest;
import com.team4.identity.auth.dto.SignUpExhibitorRequest;
import com.team4.identity.auth.dto.TokenResponse;
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

    @PostMapping("/exhibitors/signin")
    public ResponseEntity<ApiResponse<TokenResponse>> signInExhibitor(@Valid @RequestBody SignInExhibitorRequest request, HttpServletResponse response) {
        TokenResponse token = signInService.signInExhibitor(request.getBusinessNo(), request.getPassword(), response);
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
}
