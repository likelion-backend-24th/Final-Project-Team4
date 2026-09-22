package com.team4.identity.user.dto;

import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

// Admin 회원 목록: 화면에 필요한 최소 정보만
@Getter
@AllArgsConstructor
public class UserAdminSummaryResponse {
    private final Long id;
    private final String email;
    private final Role role;
    private final UserStatus status;
    private final String name;
    private final String companyName;
    private final LocalDateTime createdAt;

    public static UserAdminSummaryResponse from(User user) {
        return new UserAdminSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.getName(),
                user.getCompanyName(),
                user.getCreatedAt());
    }
}
