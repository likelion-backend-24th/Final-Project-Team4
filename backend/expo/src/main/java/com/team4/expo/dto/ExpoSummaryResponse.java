package com.team4.expo.dto;

import com.team4.expo.domain.Expo;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ExpoSummaryResponse {
    private final Long expoId;
    private final String title; // 박람회 제목
    private final String venue; // 박람회 장소
    private final LocalDateTime startsAt; // 박람회 자체 시작일
    private final LocalDateTime endsAt; // 박람회 자체 종료일
    private final LocalDateTime applyStartsAt; // 박람회 신청 시작일
    private final LocalDateTime applyEndsAt; // 박람회 신청 마감일

    public static ExpoSummaryResponse from(Expo expo) {
        return new ExpoSummaryResponse(
                expo.getId(),
                expo.getTitle(),
                expo.getVenue(),
                expo.getStartsAt(),
                expo.getEndsAt(),
                expo.getApplyStartsAt(),
                expo.getApplyEndsAt());
    }
}
