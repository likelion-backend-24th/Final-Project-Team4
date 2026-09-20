package com.team4.expo.dto;

import lombok.Getter;

// Review 서비스 -> Expo 내부 호출 응답. 후기 작성 자격(해당 부스 상담 COMPLETED)과 표시용 boothNo를 한 번에 내려준다.
@Getter
public class BoothReviewEligibilityResponse {

    private final boolean eligible;
    private final String boothNo;
    // 후기에 같이 저장할 표시용 이름(작성 시점 스냅샷). 업체명은 조회 실패/미입력 시 null.
    private final String companyName;
    private final String expoTitle;

    public BoothReviewEligibilityResponse(boolean eligible, String boothNo, String companyName, String expoTitle) {
        this.eligible = eligible;
        this.boothNo = boothNo;
        this.companyName = companyName;
        this.expoTitle = expoTitle;
    }
}
