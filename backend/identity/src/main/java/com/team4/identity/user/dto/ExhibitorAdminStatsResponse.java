package com.team4.identity.user.dto;

import lombok.Getter;

// 회원 관리(참가업체) 화면 상단 통계 카드(전체 업체/활성 업체/참가중 업체/미참가 업체).
// 참가중/미참가는 활성 업체를 대상으로만 나눔(정지·탈퇴 업체는 참가 여부 집계에서 의미가 없어 제외).
@Getter
public class ExhibitorAdminStatsResponse {
    private final long totalCount;
    private final long activeCount;
    private final long participatingCount;
    private final long notParticipatingCount;

    public ExhibitorAdminStatsResponse(long totalCount, long activeCount, long participatingCount, long notParticipatingCount) {
        this.totalCount = totalCount;
        this.activeCount = activeCount;
        this.participatingCount = participatingCount;
        this.notParticipatingCount = notParticipatingCount;
    }
}