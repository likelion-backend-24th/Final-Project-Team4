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
    private final String companyName; // 배정된 참가업체 회사명 (미배정이거나 Identity 조회 실패 시 null)
    private final String industry;    // 배정된 참가업체 업종 (미배정이거나 Identity 조회 실패 시 null)

    public static BoothDetail of(Booth booth, boolean withinApplyPeriod, String companyName, String industry) {
        return new BoothDetail(
                booth.getId(),
                booth.getBoothNo(),
                booth.getType(),
                booth.getFee(),
                booth.getStatus(),
                withinApplyPeriod && booth.getStatus() == BoothStatus.AVAILABLE,
                booth.getBannerImageUrl(),
                companyName,
                industry
        );
    }
}