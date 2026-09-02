package com.team4.identity.auth.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.business.BusinessVerification;
import com.team4.identity.auth.dto.SignUpExhibitorRequest;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SignUpService {

    private final BusinessVerification businessVerification;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void signUpExhibitor(SignUpExhibitorRequest request) {
        String businessNo = normalize(request.getBusinessNo());

        // 사업자 인증 (Mock)
        if (!businessVerification.verify(businessNo)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "사업자 인증에 실패했습니다.");
        }

        // 중복 검사
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 사용 중인 이메일입니다.");
        }
        if (userRepository.existsByBusinessNo(businessNo)) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 가입된 사업자등록번호입니다.");
        }

        // 비밀번호 해시 후 저장
        String passwordHash = passwordEncoder.encode(request.getPassword());
        User user = User.createExhibitor(request.getEmail(), passwordHash, businessNo, request.getCompanyName(), request.getManagerName(), request.getContact());

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException e) { // unique 제약 예외
            throw new CustomException(ErrorCode.DUPLICATE, "이미 가입된 이메일 또는 사업자등록번호입니다.");
        }
    }

    private String normalize(String businessNo) {
        return businessNo == null ? null : businessNo.replace("-", "");
    }
}
