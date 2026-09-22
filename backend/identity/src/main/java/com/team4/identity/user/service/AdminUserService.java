package com.team4.identity.user.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
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

// 관리자 회원 조회(목록/검색/상세). 조회 전용 - 상태·역할 변경 등은 이번 스코프 밖.
@Service
@Transactional(readOnly = true)
public class AdminUserService {

    private final UserRepository userRepository;

    public AdminUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Page<UserAdminSummaryResponse> listUsers(String keyword, Role role, UserStatus status, Pageable pageable) {
        return userRepository.search(keyword, role, status, pageable).map(UserAdminSummaryResponse::from);
    }

    public UserAdminDetailResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다."));
        return UserAdminDetailResponse.from(user);
    }
}
