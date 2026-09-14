package com.team4.identity.security.oauth2;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

// 구글은 email, name이 최상위에 바로 와서 DefaultOAuth2UserService으로 가능
// 카카오, 네이버는 이메일, 이름이 중첩된 구조로 와서 응답 받은 뒤 email, name 키를 flat해야함
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) {
        OAuth2User oAuth2User = super.loadUser(userRequest); // 실제 user-info-uri 호출은 부모가 처리
        String registrationId = userRequest.getClientRegistration().getRegistrationId(); // google | kakao | naver
        Map<String, Object> attributes = oAuth2User.getAttributes();

        Map<String, Object> mergedAttributes = new HashMap<>(attributes);
        mergedAttributes.put("email", extractEmail(registrationId, attributes));
        mergedAttributes.put("name", extractName(registrationId, attributes));

        // getClientRegistration(): application.yml의 registration.kakao 블록 전체가 담긴 객체
        // .getProviderDetails(): application.yml의 provider.kakao 블록(authorization-uri, token-uri, user-info-uri 등) 객체
        // .getUserInfoEndpoint(): user-info-uri, user-name-attribute 두 값만 담긴 객체
        // .getUserNameAttributeName(): - google: "sub", kakao: "id", naver: "response"
        String nameAttributeKey = userRequest.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        return new DefaultOAuth2User(oAuth2User.getAuthorities(), mergedAttributes, nameAttributeKey);
    }

    private String extractEmail(String registrationId, Map<String, Object> attributes) {
        return switch (registrationId) {
            case "google" -> (String) attributes.get("email");
            case "kakao" -> (String) extractKakaoAccount(attributes).get("email");
            case "naver" -> (String) extractNaverResponse(attributes).get("email");
            default -> throw unsupportedProvider(registrationId);
        };
    }

    private String extractName(String registrationId, Map<String, Object> attributes) {
        return switch (registrationId) {
            case "google" -> (String) attributes.get("name");
            case "kakao" -> (String) extractKakaoProfile(attributes).get("nickname");
            case "naver" -> (String) extractNaverResponse(attributes).get("name");
            default -> throw unsupportedProvider(registrationId);
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractKakaoAccount(Map<String, Object> attributes) {
        return (Map<String, Object>) attributes.get("kakao_account");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractKakaoProfile(Map<String, Object> attributes) {
        return (Map<String, Object>) extractKakaoAccount(attributes).get("profile");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractNaverResponse(Map<String, Object> attributes) {
        return (Map<String, Object>) attributes.get("response");
    }

    private OAuth2AuthenticationException unsupportedProvider(String registrationId) {
        return new OAuth2AuthenticationException(new OAuth2Error("invalid_provider"), "지원하지 않는 provider: " + registrationId);
    }
}
