package com.team4.identity.user.dto;

import com.team4.identity.user.domain.User;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 마이페이지 - 로그인한 사용자의 업체 및 담당자 정보
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class MyProfileResponse {

    private final String email;
    private final String role;
    private final String companyName; // 상호명
    private final String businessNo; // 사업자등록번호
    private final String managerName; // 담당자 이름
    private final String contact; // 담당자 연락처
    private final String companyContact; // 업체 대표 연락처
    private final String representativeName; // 대표자명
    private final String companyAddress; // 업체 주소
    private final String industry; // 업종
    private final String name; // 일반회원 이름

    public static MyProfileResponse from(User user) {
        return new MyProfileResponse(
                user.getEmail(),
                user.getRole().name(),
                user.getCompanyName(),
                user.getBusinessNo(),
                user.getManagerName(),
                user.getContact(),
                user.getCompanyContact(),
                user.getRepresentativeName(),
                user.getCompanyAddress(),
                user.getIndustry(),
                user.getName()
        );
    }
}
