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
import java.util.Optional;

// 소셜 로그인 인가 success Handler - CustomOAuth2UserService가 채워둔 email, name으로 기존 회원은 로그인시키고 신규 회원은 약관 동의 화면으로 보내며, 결과에 따라 프론트로 리다이렉트
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
            Optional<TokenResponse> token = socialLoginService.loginIfExists(email, response);
            if (token.isPresent()) {
                redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                        .queryParam("accessToken", token.get().getAccessToken())
                        .queryParam("role", token.get().getRole())
                        .build().toUriString();
            } else {
                // 신규 회원은 약관 동의받기 위해 가입을 보류하고 동의 화면으로 보냄
                socialLoginService.reserveSignUp(email, AuthProvider.valueOf(registrationId.toUpperCase()), providerId, name, response);
                redirectUrl = frontendUrl + "/oauth2/consent";
            }

        } catch (CustomException e) {
            // 참가업체 이메일 충돌 -> 에러코드만 실어서 리다이렉트
            redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                    .queryParam("error", e.errorCode().name())
                    .build().toUriString();
        }

        response.sendRedirect(redirectUrl);
    }
}
