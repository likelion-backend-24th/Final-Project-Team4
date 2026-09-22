package com.team4.identity.user.dto;

import com.team4.identity.user.domain.AuthProvider;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

// Admin 회원 상세: 참가업체 전용 필드(사업자정보 등)까지 전부 포함, 해당 없으면 null
@Getter
@AllArgsConstructor
public class UserAdminDetailResponse {
    private final Long id;
    private final String email;
    private final AuthProvider provider;
    private final Role role;
    private final UserStatus status;
    private final String name;
    private final String contact;
    private final String businessNo;
    private final String companyName;
    private final String managerName;
    private final String companyAddress;
    private final String industry;
    private final String representativeName;
    private final String companyContact;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public static UserAdminDetailResponse from(User user) {
        return new UserAdminDetailResponse(
                user.getId(),
                user.getEmail(),
                user.getProvider(),
                user.getRole(),
                user.getStatus(),
                user.getName(),
                user.getContact(),
                user.getBusinessNo(),
                user.getCompanyName(),
                user.getManagerName(),
                user.getCompanyAddress(),
                user.getIndustry(),
                user.getRepresentativeName(),
                user.getCompanyContact(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
