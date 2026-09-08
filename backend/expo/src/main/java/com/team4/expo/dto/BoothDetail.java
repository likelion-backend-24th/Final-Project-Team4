package com.team4.expo.dto;

import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

// ExpoBoothsResponse에 담기는 부스 1건 상세 정보
@Getter
@AllArgsConstructor
public class BoothDetail {

    private final Long boothId;
    private final String boothNo;
    private final String type;      // 부스 유형
    private final Integer fee;      // 참가비
    private final BoothStatus status;
    private final boolean applicable; // 지금 신청 가능한지 (신청 기간 내 && AVAILABLE)
    private final String bannerImageUrl; // 부스 배너 이미지 (없으면 null)

    public static BoothDetail of(Booth booth, boolean withinApplyPeriod) {
        return new BoothDetail(
                booth.getId(),
                booth.getBoothNo(),
                booth.getType(),
                booth.getFee(),
                booth.getStatus(),
                withinApplyPeriod && booth.getStatus() == BoothStatus.AVAILABLE,
                booth.getBannerImageUrl()
        );
    }
}
