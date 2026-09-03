package com.team4.expo.dto;

import lombok.Getter;

@Getter
public class BoothApplicationGroupCancelResponse {

    private final String groupId;
    private final String status;

    public BoothApplicationGroupCancelResponse(String groupId, String status) {
        this.groupId = groupId;
        this.status = status;
    }
}
