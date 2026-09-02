package com.team4.expo.dto;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BoothApplicationResponse {

    private final Long applicationId;
    private final Long boothId;
    private final ApplicationStatus status;
    private final LocalDateTime submittedAt;

    public BoothApplicationResponse(Long applicationId, Long boothId, ApplicationStatus status, LocalDateTime submittedAt) {
        this.applicationId = applicationId;
        this.boothId = boothId;
        this.status = status;
        this.submittedAt = submittedAt;
    }

    public static BoothApplicationResponse from(BoothApplication application) {
        return new BoothApplicationResponse(
                application.getId(),
                application.getBooth().getId(),
                application.getStatus(),
                application.getSubmittedAt()
        );
    }
}
