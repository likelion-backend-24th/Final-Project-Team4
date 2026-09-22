package com.team4.identity.user.dto;

import lombok.Getter;

@Getter
public class UserAdminStatsResponse {
    private final long totalCount;
    private final long activeCount;
    private final long todaySignupCount;
    private final long withdrawnCount;

    public UserAdminStatsResponse(long totalCount, long activeCount, long todaySignupCount, long withdrawnCount){
        this.totalCount = totalCount;
        this.activeCount = activeCount;
        this.todaySignupCount = todaySignupCount;
        this.withdrawnCount = withdrawnCount;
    }
}
