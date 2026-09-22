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
    private final String contact;
    // 참가업체(EXHIBITOR) 화면 전용 - User 엔티티에서 바로 채워짐(다른 역할이면 null).
    private final String businessNo;
    private final String managerName;
    // 참관객(USER) 화면 전용 - Reservation 벌크 조회로 채워짐. 조회 안 했거나 EXHIBITOR/ADMIN이면 null(=표시 안 함).
    private final Boolean checkedIn;
    private final LocalDateTime lastCheckedInAt;
    // 참가업체(EXHIBITOR) 화면 전용 - Expo 벌크 조회로 채워짐. 조회 안 했거나 USER/ADMIN이면 null(=표시 안 함).
    private final Long applicationCount;
    private final Boolean participating;

    public static UserAdminSummaryResponse from(User user) {
        return new UserAdminSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.getName(),
                user.getCompanyName(),
                user.getCreatedAt(),
                user.getContact(),
                user.getBusinessNo(),
                user.getManagerName(),
                null,
                null,
                null,
                null);
    }

    // AdminUserService가 Reservation 벌크 조회 결과로 체크인 정보를 나중에 채울 때 씀(불변 객체라 새로 만들어 반환).
    public UserAdminSummaryResponse withCheckIn(boolean checkedIn, LocalDateTime lastCheckedInAt) {
        return new UserAdminSummaryResponse(
                id, email, role, status, name, companyName, createdAt, contact, businessNo, managerName,
                checkedIn, lastCheckedInAt, applicationCount, participating);
    }

    // AdminUserService가 Expo 벌크 조회 결과로 참가 신청 건수·참가 여부를 나중에 채울 때 씀(불변 객체라 새로 만들어 반환).
    public UserAdminSummaryResponse withExhibitorStats(long applicationCount, boolean participating) {
        return new UserAdminSummaryResponse(
                id, email, role, status, name, companyName, createdAt, contact, businessNo, managerName,
                checkedIn, lastCheckedInAt, applicationCount, participating);
    }
}