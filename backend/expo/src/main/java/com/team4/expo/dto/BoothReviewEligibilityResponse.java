package com.team4.expo.dto;

import lombok.Getter;

// Review 서비스 -> Expo 내부 호출 응답. 후기 작성 자격(해당 부스 상담 COMPLETED)과 표시용 boothNo를 한 번에 내려준다.
@Getter
public class BoothReviewEligibilityResponse {

    private final boolean eligible;
    private final String boothNo;

    public BoothReviewEligibilityResponse(boolean eligible, String boothNo) {
        this.eligible = eligible;
        this.boothNo = boothNo;
    }
}
