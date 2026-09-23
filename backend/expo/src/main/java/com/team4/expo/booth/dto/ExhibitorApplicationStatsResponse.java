package com.team4.expo.booth.dto;

import lombok.Getter;

@Getter
public class ExhibitorApplicationStatsResponse {
    private final Long exhibitorId;
    private final long applicationCount;
    private final boolean participating;

    public ExhibitorApplicationStatsResponse(Long exhibitorId, Long applicationCount, boolean participating){
        this.exhibitorId = exhibitorId;
        this.applicationCount = applicationCount;
        this.participating = participating;
    }
}
