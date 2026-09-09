package com.team4.identity.user.dto;

import com.team4.identity.user.domain.User;

// 서비스 간 내부 조회용 최소 응답
// businessNo/representativeName/email은 Admin의 참가 신청 심사 화면(신청 업체 대표 정보)에서 씀.
public record InternalUserResponse (
        String companyName,
        String industry,
        String businessNo,
        String representativeName,
        String email
) {
    public static InternalUserResponse from(User user){
        return new InternalUserResponse(
                user.getCompanyName(),
                user.getIndustry(),
                user.getBusinessNo(),
                user.getRepresentativeName(),
                user.getEmail()
        );
    }
}