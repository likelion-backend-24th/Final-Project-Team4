package com.team4.expo.dto;

import com.team4.expo.domain.ApplicationStatus;
import java.util.List;
import lombok.Getter;

@Getter
public class BoothApplicationGroupReleaseResponse {

    private final String groupId;
    private final List<Result> results;

    public BoothApplicationGroupReleaseResponse(String groupId, List<Result> results) {
        this.groupId = groupId;
        this.results = results;
    }

    @Getter
    public static class Result {
        private final Long applicationId;
        private final Long boothId;
        private final ApplicationStatus status;

        public Result(Long applicationId, Long boothId, ApplicationStatus status) {
            this.applicationId = applicationId;
            this.boothId = boothId;
            this.status = status;
        }
    }
}
