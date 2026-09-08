package com.team4.expo.dto;

import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoPhase;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// 박람회 목록/요약 조회 응답
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
    private final ExpoPhase phase; // 진행 단계 (모집예정/모집중/개최예정/진행중/진행종료)
    private final long boothCount; // 참여 확정(ASSIGNED) 부스 수

    public static ExpoSummaryResponse of(Expo expo, ExpoPhase phase, long boothCount) {
        return new ExpoSummaryResponse(
                expo.getId(),
                expo.getTitle(),
                expo.getVenue(),
                expo.getStartsAt(),
                expo.getEndsAt(),
                expo.getApplyStartsAt(),
                expo.getApplyEndsAt(),
                phase,
                boothCount);
    }
}
