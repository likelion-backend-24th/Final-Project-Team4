package com.team4.expo.dto;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import lombok.Getter;



// 부스 신청 그룹 안 부스 1건의 상태.
@Getter
public class BoothApplicationResponse {

    private final Long applicationId;
    private final Long boothId;
    private final ApplicationStatus status;

    public BoothApplicationResponse(Long applicationId, Long boothId, ApplicationStatus status) {
        this.applicationId = applicationId;
        this.boothId = boothId;
        this.status = status;
    }

    public static BoothApplicationResponse from(BoothApplication application) {
        return new BoothApplicationResponse(
                application.getId(),
                application.getBooth().getId(),
                application.getStatus()
        );
    }
}
