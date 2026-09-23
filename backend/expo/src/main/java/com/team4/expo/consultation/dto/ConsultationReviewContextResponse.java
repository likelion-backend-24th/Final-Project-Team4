package com.team4.expo.consultation.dto;

import lombok.Getter;

// 고객이 후기 작성 화면에서 "상담내용" 패널로 볼 수 있는 정보 - 본인이 신청 시 남긴 요구사항 +
// 참가업체가 현장 상담 후 남긴 메모(있는 경우). AI 후기 초안 생성에도 같은 값을 사용한다.
@Getter
public class ConsultationReviewContextResponse {

    private final String interestedVehicle;
    private final boolean wantsPurchase;
    private final boolean wantsTestDrive;
    private final String customerMessage;
    private final String exhibitorNote;

    public ConsultationReviewContextResponse(String interestedVehicle, boolean wantsPurchase, boolean wantsTestDrive,
                                              String customerMessage, String exhibitorNote) {
        this.interestedVehicle = interestedVehicle;
        this.wantsPurchase = wantsPurchase;
        this.wantsTestDrive = wantsTestDrive;
        this.customerMessage = customerMessage;
        this.exhibitorNote = exhibitorNote;
    }
}
