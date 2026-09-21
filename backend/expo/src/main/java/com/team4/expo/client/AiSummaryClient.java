package com.team4.expo.client;

import java.util.Optional;

// 상담 신청 내용을 참가업체가 보기 쉽게 한두 문장으로 요약. 부가 기능이라 실패해도 상담 신청 자체는 막지 않는다
// (구현체는 예외를 삼키고 Optional.empty()를 반환 - fail-open).
public interface AiSummaryClient {
    Optional<String> summarizeConsultation(boolean wantsPurchase, boolean wantsTestDrive,
                                            String interestedVehicle, boolean hasDriverLicense, String message);

    // 참가업체가 현장에서 적은 상담 메모(consultationNote)를 고객에게 보낼 정중한 이메일 본문으로 정리(TASK 11-3).
    // 부가 기능이라 실패해도 리드 자체는 막지 않는다(구현체는 예외를 삼키고 Optional.empty() 반환 - fail-open).
    Optional<String> summarizeForEmail(String customerName, String consultationNote);

    // 고객이 후기 작성 시 자기 상담 요구사항 + 참가업체 상담 메모를 바탕으로 후기 초안을 생성(TASK 후기).
    // 부가 기능이라 실패해도 후기 작성 자체는 막지 않는다(구현체는 예외를 삼키고 Optional.empty() 반환 - fail-open).
    Optional<String> draftReview(String reviewType, String vehicleName, String customerMessage, String exhibitorNote);

    // 고객이 직접 쓴 후기 문장을 맞춤법·문장 흐름·종결어미(~요/~습니다 통일)만 다듬는다(내용·사실은 그대로). 부가 기능이라 실패해도 후기 작성은 막지 않는다
    // (구현체는 예외를 삼키고 Optional.empty() 반환 - fail-open).
    Optional<String> polishReview(String reviewType, String vehicleName, String content);

    // 관리자가 박람회 등록/수정 화면에서 박람회명(+장소)을 키워드로 행사 소개 문구 초안을 생성.
    // 부가 기능이라 실패해도 등록 자체는 막지 않는다(구현체는 예외를 삼키고 Optional.empty() 반환 - fail-open).
    Optional<String> draftExpoDescription(String title, String venue);
}
