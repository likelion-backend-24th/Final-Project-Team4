package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.dto.TokenResponse;
import com.team4.identity.user.domain.AuthProvider;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 소셜 로그인 계정 연동 - 이메일로 기존 USER 계정과 연동하거나 신규 생성
// 같은 이메일이 EXHIBITOR로 가입돼 있으면 계정 종류 충돌로 거부
@Service
@RequiredArgsConstructor
public class SocialLoginService {

    private final UserRepository userRepository;
    private final SignInService signInService;

    @Transactional
    public TokenResponse loginOrSignUp(String email, AuthProvider provider, String providerId, String name, HttpServletResponse response) {
        User user = userRepository.findByEmail(email)
                .map(this::checkLinkable)
                .orElseGet(() -> userRepository.save(User.createSocialMember(email, provider, providerId, name)));

        return signInService.issue(user, response);
    }

    private User checkLinkable(User user) {
        if (user.getRole() == Role.EXHIBITOR) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 참가업체로 가입된 이메일입니다.");
        }
        return user;
    }
}
