package com.team4.expo.dto;

import lombok.Getter;

// 부스 신청 그룹 취소(삭제) 응답
@Getter
public class BoothApplicationGroupCancelResponse {

    private final String groupId;
    private final String status;

    public BoothApplicationGroupCancelResponse(String groupId, String status) {
        this.groupId = groupId;
        this.status = status;
    }
}
