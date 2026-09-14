package com.team4.identity.security.oauth2;

import com.team4.common.error.CustomException;
import com.team4.identity.auth.dto.TokenResponse;
import com.team4.identity.auth.service.SocialLoginService;
import com.team4.identity.user.domain.AuthProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

// 소셜 로그인 인가 success Handler - CustomOAuth2UserService가 채워둔 email, name으로 계정 연동/발급하고 프론트로 리다이렉트
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final SocialLoginService socialLoginService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oAuth2Token = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = oAuth2Token.getPrincipal();

        String registrationId = oAuth2Token.getAuthorizedClientRegistrationId(); // google | kakao | naver
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getName(); // CustomOAuth2UserService가 지정한 nameAttributeKey 값

        String redirectUrl;
        try {
            TokenResponse token = socialLoginService.loginOrSignUp(email, AuthProvider.valueOf(registrationId.toUpperCase()), providerId, name, response);
            redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                    .queryParam("accessToken", token.getAccessToken())
                    .queryParam("role", token.getRole())
                    .build().toUriString();

        } catch (CustomException e) {
            // 참가업체 이메일 충돌 -> 에러코드만 실어서 리다이렉트
            redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                    .queryParam("error", e.errorCode().name())
                    .build().toUriString();
        }

        response.sendRedirect(redirectUrl);
    }
}
