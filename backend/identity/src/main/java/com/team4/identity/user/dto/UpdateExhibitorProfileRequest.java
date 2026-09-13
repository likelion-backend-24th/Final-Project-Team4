package com.team4.identity.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 마이페이지 - 참가업체 정보 수정
@Getter
@AllArgsConstructor
public class UpdateExhibitorProfileRequest {

    private final String companyName;
    private final String managerName;
    private final String contact;
    private final String companyContact;
    private final String companyAddress;
    private final String industry;
    private final String representativeName;
}
