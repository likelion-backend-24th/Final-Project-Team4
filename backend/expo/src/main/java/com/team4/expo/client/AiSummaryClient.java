package com.team4.expo.client;

import java.util.Optional;

// 상담 신청 내용을 참가업체가 보기 쉽게 한두 문장으로 요약. 부가 기능이라 실패해도 상담 신청 자체는 막지 않는다
// (구현체는 예외를 삼키고 Optional.empty()를 반환 - fail-open).
public interface AiSummaryClient {
    Optional<String> summarizeConsultation(boolean wantsPurchase, boolean wantsTestDrive,
                                            String interestedVehicle, boolean hasDriverLicense, String message);
}
