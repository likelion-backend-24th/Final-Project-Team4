package com.team4.expo.expo.dto;

import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.domain.ExpoPhase;
import com.team4.expo.expo.domain.ExpoStatus;
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
    private final String description; // 행사 소개 문구
    private final LocalDateTime startsAt; // 박람회 자체 시작일
    private final LocalDateTime endsAt; // 박람회 자체 종료일
    private final LocalDateTime applyStartsAt; // 박람회 신청 시작일
    private final LocalDateTime applyEndsAt; // 박람회 신청 마감일
    private final Long admissionFee; // 당일 유료 입장료
    private final String bannerImageUrl; // 박람회 배너 이미지 경로
    private final ExpoPhase phase; // 진행 단계 (모집예정/모집중/개최예정/진행중/진행종료)
    private final long boothCount; // 참여 확정(ASSIGNED) 부스 수
    private final ExpoStatus status; // DRAFT/OPEN - 고객·참가업체 조회는 항상 OPEN만 나가고, Admin 수정 화면의 공개/비공개 버튼 표시에 사용
    private final boolean hasApplications; // 부스 신청 존재 여부 - Admin 수정 화면에서 일정 필드 수정 가능 여부 판단용. 고객·참가업체 조회에서는 항상 false(조회 안 함)

    // 고객·참가업체 조회용 - 신청 존재 여부는 필요 없어서 조회하지 않고 false 고정
    public static ExpoSummaryResponse of(Expo expo, ExpoPhase phase, long boothCount) {
        return of(expo, phase, boothCount, false);
    }

    // Admin 수정 화면 조회용 - 신청 존재 여부를 실제로 계산해서 넣어줌
    public static ExpoSummaryResponse of(Expo expo, ExpoPhase phase, long boothCount, boolean hasApplications) {
        return new ExpoSummaryResponse(
                expo.getId(),
                expo.getTitle(),
                expo.getVenue(),
                expo.getDescription(),
                expo.getStartsAt(),
                expo.getEndsAt(),
                expo.getApplyStartsAt(),
                expo.getApplyEndsAt(),
                expo.getAdmissionFee(),
                expo.getBannerImageUrl(),
                phase,
                boothCount,
                expo.getStatus(),
                hasApplications);
    }
}
