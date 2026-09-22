package com.team4.identity.expo.client;

// Expo의 /internal/expo/exhibitors/application-stats 응답 1건 - 관리자 회원(참가업체) 목록 enrich용.
public record ExhibitorApplicationStats(Long exhibitorId, long applicationCount, boolean participating) {
}