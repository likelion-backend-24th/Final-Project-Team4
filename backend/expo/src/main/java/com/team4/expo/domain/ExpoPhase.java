package com.team4.expo.domain;

import com.fasterxml.jackson.annotation.JsonValue;

import java.time.LocalDateTime;

// 방문자에게 보여줄 박람회 진행 단계. Expo 날짜로 계산
public enum ExpoPhase {
    RECRUIT_SCHEDULED("모집예정"), // 부스 신청 시작 전
    RECRUITING("모집중"),          // 부스 신청 기간
    OPEN_SCHEDULED("개최예정"),     // 신청 마감 ~ 행사 시작 전
    ONGOING("진행중"),             // 행사 기간
    ENDED("진행종료");             // 행사 종료

    private final String label;

    ExpoPhase(String label) {
        this.label = label;
    }

    @JsonValue
    public String label() {
        return label;
    }

    public static ExpoPhase of(Expo expo, LocalDateTime now) {
        if (now.isAfter(expo.getEndsAt())) {
            return ENDED;
        }
        if (!now.isBefore(expo.getStartsAt())) {
            return ONGOING;
        }
        if (now.isBefore(expo.getApplyStartsAt())) {
            return RECRUIT_SCHEDULED;
        }
        if (!now.isAfter(expo.getApplyEndsAt())) {
            return RECRUITING;
        }
        return OPEN_SCHEDULED;
    }
}
