package com.team4.identity.user.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.identity.auth.service.SignInService;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.dto.MyProfileResponse;
import com.team4.identity.user.dto.UpdateExhibitorProfileRequest;
import com.team4.identity.user.dto.UpdateMemberProfileRequest;
import com.team4.identity.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

// 마이페이지 - 내 프로필 조회 / 수정 / 회원 탈퇴
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

    // 일반회원 정보 수정
    @Transactional
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<MyProfileResponse>> updateMe(@RequestHeader("X-User-Id") Long userId,
                                                                    @RequestBody UpdateMemberProfileRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        if (user.getRole() != Role.USER) {
            throw new CustomException(ErrorCode.FORBIDDEN, "일반회원만 이용할 수 있습니다.");
        }

        Optional.ofNullable(request.getName()).ifPresent(user::changeName);
        Optional.ofNullable(request.getContact()).ifPresent(user::changeContact);

        return ResponseEntity.ok(ApiResponse.success(MyProfileResponse.from(user)));
    }

    // 참가업체 정보 수정
    @Transactional
    @PatchMapping("/exhibitors/me")
    public ResponseEntity<ApiResponse<MyProfileResponse>> updateExhibitorMe(@RequestHeader("X-User-Id") Long userId,
                                                                             @RequestBody UpdateExhibitorProfileRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        if (user.getRole() != Role.EXHIBITOR) {
            throw new CustomException(ErrorCode.FORBIDDEN, "참가업체만 이용할 수 있습니다.");
        }

        Optional.ofNullable(request.getCompanyName()).ifPresent(user::changeCompanyName);
        Optional.ofNullable(request.getManagerName()).ifPresent(user::changeManagerName);
        Optional.ofNullable(request.getContact()).ifPresent(user::changeContact);
        Optional.ofNullable(request.getCompanyContact()).ifPresent(user::changeCompanyContact);
        Optional.ofNullable(request.getCompanyAddress()).ifPresent(user::changeCompanyAddress);
        Optional.ofNullable(request.getIndustry()).ifPresent(user::changeIndustry);
        Optional.ofNullable(request.getRepresentativeName()).ifPresent(user::changeRepresentativeName);

        return ResponseEntity.ok(ApiResponse.success(MyProfileResponse.from(user)));
    }

    // 회원 탈퇴(soft delete)
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> withdraw(@RequestHeader("X-User-Id") Long userId, HttpServletResponse response) {
        signInService.withdrawUser(userId, response);

        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
