package com.team4.expo.dto;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import lombok.Getter;

// 부스 신청 승인/반려 처리 결과.
@Getter
public class BoothApplicationDecisionResponse {

    private final Long applicationId;
    private final Long boothId;
    private final ApplicationStatus status;
    private final String rejectReason;

    public BoothApplicationDecisionResponse(Long applicationId, Long boothId, ApplicationStatus status, String rejectReason) {
        this.applicationId = applicationId;
        this.boothId = boothId;
        this.status = status;
        this.rejectReason = rejectReason;
    }

    public static BoothApplicationDecisionResponse from(BoothApplication application) {
        return new BoothApplicationDecisionResponse(
                application.getId(),
                application.getBooth().getId(),
                application.getStatus(),
                application.getRejectReason()
        );
    }
}
