package com.team4.identity.user.dto;

import com.team4.identity.user.domain.User;

// 서비스 간 내부 조회용 최소 응답
public record InternalUserResponse (String companyName, String industry){
    public static InternalUserResponse from(User user){
        return new InternalUserResponse(user.getCompanyName(), user.getIndustry());
    }
}
