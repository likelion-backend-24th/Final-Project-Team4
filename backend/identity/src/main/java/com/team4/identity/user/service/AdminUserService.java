package com.team4.identity.user.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.service.RefreshTokenStore;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.dto.UserAdminDetailResponse;
import com.team4.identity.user.dto.UserAdminSummaryResponse;
import com.team4.identity.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 관리자 회원 조회(목록/검색/상세) + 정지/정지해제. 역할 변경·강제 탈퇴는 스코프 밖.
@Service
@Transactional(readOnly = true)
public class AdminUserService {

    private final UserRepository userRepository;
    private final RefreshTokenStore refreshTokenStore;

    public AdminUserService(UserRepository userRepository, RefreshTokenStore refreshTokenStore) {
        this.userRepository = userRepository;
        this.refreshTokenStore = refreshTokenStore;
    }

    public Page<UserAdminSummaryResponse> listUsers(String keyword, Role role, UserStatus status, Pageable pageable) {
        return userRepository.search(keyword, role, status, pageable).map(UserAdminSummaryResponse::from);
    }

    public UserAdminDetailResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다."));
        return UserAdminDetailResponse.from(user);
    }

    // 회원 정지/정지 해제. ACTIVE<->LOCKED 전환만 허용(관리자 계정, 탈퇴한 계정은 대상 아님).
    @Transactional
    public UserAdminDetailResponse updateStatus(Long userId, UserStatus targetStatus) {
        if (targetStatus != UserStatus.ACTIVE && targetStatus != UserStatus.LOCKED) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "정지 또는 정지 해제만 가능합니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다."));

        if (user.getRole() == Role.ADMIN) {
            throw new CustomException(ErrorCode.FORBIDDEN, "관리자 계정은 상태를 변경할 수 없습니다.");
        }
        if (user.getStatus() == UserStatus.WITHDRAWN) {
            throw new CustomException(ErrorCode.INVALID_STATE, "탈퇴한 회원은 상태를 변경할 수 없습니다.");
        }

        if (targetStatus == UserStatus.LOCKED) {
            user.lock();
            refreshTokenStore.delete(userId); // 정지 즉시 강제 로그아웃
        } else {
            user.activate();
        }

        return UserAdminDetailResponse.from(user);
    }
}
