package com.team4.expo.dto;

import com.team4.expo.domain.BoothApplication;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Getter;

// applyBooth / updateBoothApplicationDraft / submitBoothApplicationDraft 공통 응답.
@Getter
public class BoothApplicationGroupResponse {

    private final String groupId;
    private final List<BoothApplicationResponse> applications;

    public BoothApplicationGroupResponse(String groupId, List<BoothApplicationResponse> applications) {
        this.groupId = groupId;
        this.applications = applications;
    }

    public static BoothApplicationGroupResponse from(String groupId, List<BoothApplication> applications) {
        return new BoothApplicationGroupResponse(
                groupId,
                applications.stream().map(BoothApplicationResponse::from).collect(Collectors.toList())
        );
    }
}
