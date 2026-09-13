package com.team4.identity.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 마이페이지 - 일반회원 정보 수정
@Getter
@AllArgsConstructor
public class UpdateMemberProfileRequest {

    private final String name;
    private final String contact;
}
